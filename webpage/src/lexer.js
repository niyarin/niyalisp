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





Lexer.analyze_atom = function(atom,line,pos,filename){
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
            return new Lexer.Token("char",atom[2],line);
        }else if (atom[1] == "\\"){
            if (atom == "#\\space"){
                return new Lexer.Token("char"," ",line);
            }else if (atom == "#\\newline"){
                return new Lexer.Token("char","\n",line);
            }

        }
        return new Lexer.Token("error","invalid token " + ("(line:" + line + ") ") + atom);
    }
    
    //'-'
    if (atom == "-"){
      return new Lexer.Token("symbol","-",line);
    }
    if (atom == "+"){
      return new Lexer.Token("symbol","+",line);
    }
    
    
    //数値
    if (atom == "+inf.0"){
        return new Lexer.Token("float",Infinity);
    }else if (atom == "-inf.0"){
        return new Lexer.Token("float",-Infinity);
    }else if (atom == "+nan.0"){
        return new Lexer.Token("float",NaN);
    }

    //integer or flaot(先頭が[0-9]|-)
    var c = atom.charCodeAt(0);
    if ((c >= 48 && c <= 57) || c == 45 || c == 43){
        var start = 0;

        var is_integer = true;
        var is_float = 0;
        var is_complex_i = 0;
        var is_complex_at = 0;
        var is_fraction = 0;
        
        var contain_pm = 0;
      

        if (c == 45){
            start = 1;
        }else if (c == 43){
            start = 1;
        }

        for (var i=start;i<atom.length;i++){
            var c = atom.charCodeAt(i);
            if (c == 46){
                is_float++;
                is_integer = false;
            }else if (c == 47){
                is_fraction++;
                is_integer = false;
            }else if (c == 105){
                is_complex_i++;
                is_integer = false;
            }else if (c == 64){
                is_complex_at++;
                is_integer = false;
            }else if (c == 43){
                contain_pm++;
                is_integer = false;
            }else if (c == 45){
                contain_pm--;
                is_integer = false;
            }else if (!(c >= 48 && c <= 57)){
                is_integer = false;
                break;
            }
        }
        
        if (is_integer){
            return new Lexer.Token("integer",parseInt(atom,10),line);   
        }else if (is_float == 1){
           var f = parseFloat(atom);
           return new Lexer.Token("float",f,line);
        }else if (is_fraction == 1){
            var n_d = atom.split("/");
            var n_d_data = [parseInt(n_d[0],10),parseInt(n_d[1],10)];
            return new Lexer.Token("fraction",n_d_data);
        }else if (is_complex_at == 1){
            
        }else if (is_complex_i == 1){
            if (contain_pm || start){
                var ri = null;
                var sign = 1;
                if (contain_pm == 1||start){
                    ri = atom.split("+");
                    sign = 1;
                }else if (contain_pm == -1||start){
                    ri = atom.split("-");
                    sign = -1;
                }
                if (atom.match("[0-9]*[+-][0-9]*")){
                    var real_part = ri[0];
                    var image_part = ri[1].split("i")[0];
                    if (!real_part){
                        real_part = "0";
                    }
                    if (!image_part){
                        image_part = "1";
                    }
                    real_part = Lexer.analyze_atom(real_part,0,0);
                    image_part = Lexer.analyze_atom(image_part,0,0);
                    return new Lexer.Token("complex",[real_part,image_part,sign]);
                }
            }
        }
    }
    return new Lexer.Token("symbol",atom,"" + line + " " + pos);
}



// 後でfix
//文字列リテラルをシンボルの後に無空白の状態でおくと順序がおかしくなる
//

Lexer.lexer = function(text,filename){
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
                    ret.push(Lexer.analyze_atom(s,line,pos,filename));
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
        }else if (c.data == ","){
             
        }else if (c.data == ",@"){
        
        }

        var ret = new Lexer.Pair(c,null);
        return ret;
    }
}   




