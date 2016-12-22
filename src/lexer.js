var Lexer = {};


//for node.js
var is_node = typeof require !==  "undefined";
if (is_node){
    module.exports = Lexer;
}




Lexer.Token = function(type,data,line,tag){
    this.type = type;
    this.data = data;
    this.line = line;
    this.tag = tag;
}


Lexer.Pair = function(car,cdr){
    this.type = "pair";
    this.car = car;
    this.cdr = cdr;
    this.tag = null;
}





Lexer.analyze_atom = function(atom,line,pos){

    // true false char
    if (atom.length >= 2 && atom[0] == "#"){
        {//true false
            if (atom == "#t" || atom == "#f" ){
                return new Lexer.Token("bool",atom,line);
            }else if (atom == "#true" || atom == "#false"){
                if (atom == "#true"){
                    return new Lexer.Token("bool","#t",line);
                }else{
                    return new Lexer.Token("bool","#f",line);
                }
            }
        }



        if (atom[1] == "\\" && atom.length == 3){
            return new Lexer.Token("char",atom,line);
        }
        return new Lexer.Token("error","invalid token " + ("(line:" + line + ") ") + atom);
    }

    if (atom.length == 1 && atom[0] == "-"){
      return new Lexer.Token("symbol","-",line);
    }


    
    //integer
    var c = atom.charCodeAt(0);
    if ((c >= 48 && c <= 57) || c == 45){
        var start = 0;
        var is_integer = true;
        if (c == 45){
            start = 1;
        }
        for (var i=start;i<atom.length;i++){
            var c = atom.charCodeAt(i);
            if (!(c >= 48 && c <= 57)){
                is_integer = false;
                break;
            }
        }
        if (is_integer){
            return new Lexer.Token("integer",parseInt(atom,10),line);   
        }
    }
    
    return new Lexer.Token("symbol",atom,"" + line + " " + pos);
}



// 後でfix
//文字列リテラルをシンボルの後に無空白の状態でおくと順序がおかしくなる
//

Lexer.lexer = function(text){
    text += " ";
    var ret = [];
    var s = "";
    var after_token = "";
    var slice_flag = false;

    var quote = new Lexer.Token("quote",null);
    var quasi_quote = new Lexer.Token("quasiquote",null);
    
    var i=0;
    var pos = 0;
    var line = 0;

    var nest = 0;
    while (i<text.length){
        var c = text[i];
        if (c == "(" || c == ")"){
            if (s == "#\\"){
                s += c;
                slice_flag = true;
            }else{
                after_token = c;
            }
            if (c == "("){
                nest++;
            }else if (c == ")"){
                if (nest == 0){
                    return "ERROR:read error extra close (line:" + (line + 1) +")";
                }
                nest--;
            }
            slice_flag = true;
        }else if (c == " " || c == "\t"){
            if (s == "#\\"){
                s += c;
            }
            slice_flag = true;
        }else if (c == "\n"){
            if (s == "#\\"){
                s += c;
            }
            slice_flag = true;
            pos = 0;
            line++;
        }else if (c == "\""){
            i++;
            var str = "";
            while (i<text.length){
                if (text[i] == "\""){
                    break;
                }
                str += text[i];
                i++;
            }
            ret.push(new Lexer.Token("string",str,line));
        }else if (c == "\'"){
            ret.push(quote);
        }else if (c == "\`"){
            ret.push(quasi_quote);
        }else{
            s += c;
        }

        if (slice_flag){

            if (s){
                if (s == "."){
                    ret.push(new Lexer.Token("DOT"));
                    s = "";
                }else if (s == "#"){
                    ret.push(new Lexer.Token("SHARP"));
                    s = "";
                }else{
                    ret.push(Lexer.analyze_atom(s,line,pos));
                    s = "";
                    pos++;
                }
            }
            slice_flag = false;
            if (after_token){
                ret.push(after_token);
                after_token = "";
            }
        }
        i++;
    }
    
    if (nest>0){
        return "ERROR:read error unterminated list";
    }

    return ret;
}







Lexer.generate_lexer_error = function(error_code,obj){
  var txt = error_code + " (line:" + (obj.line + 1)+ ")" ;
  var ret = new Lexer.Token("error",txt);
  ret.line = obj.line;
  return ret;
}




Lexer.is_dot_list = function(ls){
  var cell = ls;
  while (cell){
    if (cell.type != "pair"){
        return new Lexer.generate_lexer_error("ERROR:proper list required",cell);
    }
    cell = cell.cdr;
  }
  return false;
}



Lexer.convert_list = function(code){
    var c = code.shift();

    if (c == "("){
        var front = new Lexer.Pair(null,null);
        var cell = front;
        while (code[0]!=")"){
            cell.cdr = Lexer.convert_list(code);
            cell = cell.cdr;
        }
        code.shift();
        var ret = new Lexer.Pair(null,null);
        ret.car = front.cdr;
        return ret;
    }else if (c == ")"){
        console.log("ERROR");
        //error
    }else{
        if (c.type == "DOT"){
            var cc = Lexer.convert_list(code);
            if (code[0] != ")"){
                return new Lexer.Pair(Lexer.generate_lexer_error("error:invalid pair code ",cc.car),null);
            }
            return cc.car;
        }else  if (c.type == "quote"||c.type == "quasiquote"){
            var next = null;
            if (code.length == 0){
            }else if (code[0] == ")"){
            }else{
                next = Lexer.convert_list(code);
            }
            var ret = new Lexer.Pair(
                    new Lexer.Pair(new Lexer.Token("symbol",c.type,-1),next));
            return ret;
        }else if (c.type == "SHARP"){
            var vector = Lexer.convert_list(code);
            //vector must be proper list
            var is_dot_list = Lexer.is_dot_list(vector.car);
            if (is_dot_list){
                return new Lexer.Pair(is_dot_list,null);
            }
            return new Lexer.Pair(new Lexer.Token("vector",vector.car,-1),null);
        }
            

        var ret = new Lexer.Pair(c,null);
        return ret;
    }
}   




