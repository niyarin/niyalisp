var Syntax_converter = {};
Syntax_converter.Env = {};
Syntax_converter.Syntax = {};
Syntax_converter.utils = {};
Syntax_converter.Share_object = {};

Syntax_converter.Alpha_renaming = {};




// for node
var is_node = typeof require !==  "undefined";
if (is_node){
    module.exports = Syntax_converter;
    var Lexer = require("./lexer");
    var Syntax_rules = require("./syntax_rules");
}




function print_red(o){
        var red     = '\u001b[43m';
        var reset   = '\u001b[49m';
        console.log(red);
        console.log(o);
        console.log(reset);       
}


function list_write(list,nest){
    if (!nest){nest = 0;}
    if (list==null){console.log(Array(nest+1).join(" "),"()");return;}

    if (list.type == "pair"){
        var cell = list;
        console.log(Array(nest+1).join(" "),"(");
        while (cell){
            list_write(cell.car,nest+1);
            cell = cell.cdr;
            if (cell && cell.type != "pair"){
                console.log (Array(nest+2).join("  "),".");
                list_write(cell,nest+1);
                break;
            }
        }
        console.log(Array(nest+1).join(" "),")");
    }else{
        if (list.type == "symbol"){
            console.log(Array(nest+1).join("  "),list.data);
        }else if (list.type == "bool"){
            console.log(Array(nest+1).join("  "),"bool:",list.data);
        }else if (list.type == "integer"){
            console.log(Array(nest+1).join("  "),list.data);
        }else if (list.type == "undefined"){
            console.log(Array(nest+1).join("  "),"#undefined");
        }else if (list.type == "vector"){
            console.log("#");
            list_write(list.data,nest);
        }else if (list.type == "symbol-env"){
            var d = "<E-"+list.data + "(" + list.tag + ")" + ">";
            console.log(Array(nest+1).join(" "),d);
        }else if (list.type == "string"){
            console.log('"' + list.data + '"');
        }else{
            console.log("?",list);
        }
    }
}





//
//UTILS
//
//


Syntax_converter.utils.is_proper_list = function(ls){
    var ret = 0;
    var cell = ls;
    while (cell){
        if (cell.type != "pair"){
            return false;
        }
        ret++;
        cell = cell.cdr;
    }
    return ret;
}



Syntax_converter.utils.generate_proper_list = function(arr){
    var ret = new Lexer.Pair(null,null);
    var ret_front = ret;
    for (var i=0;i<arr.length;i++){
        ret.cdr = new Lexer.Pair(arr[i],null);
        ret = ret.cdr;
    }
    return ret_front.cdr;
}



Syntax_converter.utils.generate_let = function(inits,body_cell){
    var init_cell = new Lexer.Pair(null,null);
    for (var i=0;i<inits.length;i++){
        init_cell.cdr = new Lexer.Pair(new Lexer.Pair(inits[i][0],new Lexer.Pair(inits[i][1],null)),null);
        init_cell = init_cell.cdr;
    }
    return new Lexer.Pair(Syntax_converter.Share_object.let,
        new Lexer.Pair(init_cell,body_cell));
}


Syntax_converter.utils.generate_lambda = function(formals,body_cell){
    var formal_cell = new Lexer.Pair(null,null);

    var formal_cell_head = formal_cell;
    for (var i=0;i<formals.length;i++){
        formal_cell.cdr = new Lexer.Pair(formals[i],null);
        formal_cell = formal_cell.cdr;
    }
    return new Lexer.Pair(Syntax_converter.Share_object.lambda,
        new Lexer.Pair(formal_cell_head.cdr,body_cell));
}







//
//Syntax
//
//


Syntax_converter.Syntax.Syntax_token = function(syntax_name){
    this.type = "syntax";
    this.data = syntax_name;
}





Syntax_converter.Syntax.lambda = function(){
    this.syntax_check = function(code){
        var count = Syntax_converter.utils.is_proper_list(code);
        if (!count || count < 3){
            return "ERROR:syntax_error <lambda> ";
        }
        return false;
    }

    this.convert = function(code,env,next_converter){
        //
        //複数body未対応
        //
        var bodies = code.cdr.cdr;
        var begin_wrapper = new Lexer.Pair("I AM BEGIN",bodies);
        bodies = Syntax_converter.Share_object.begin_converter.convert(begin_wrapper,env,next_converter);
       
        var seti_flag = false;
        if (bodies.type == "pair"){
            if (bodies.car.type != "syntax"){
                var cell = bodies;
                while (cell){
                    if (cell.car.type == "pair"){
                        if (cell.car.car.type == "syntax" && cell.car.car.data == "set!"){
                            seti_flag = true;
                            break;
                        }
                    }
                    cell = cell.cdr;

                }
            }
        
        }
        if (seti_flag){
            bodies = new Lexer.Pair(new Lexer.Pair(Syntax_converter.Share_object.lambda_token,new Lexer.Pair(null,new Lexer.Pair(bodies,null))),null);

        }

        return new Lexer.Pair(Syntax_converter.Share_object.lambda_token,
                 new Lexer.Pair(code.cdr.car,
                     new Lexer.Pair(bodies,null)));
    }
}


Syntax_converter.Syntax.begin = function(){
    this.syntax_check = function(code){
        var count = Syntax_converter.utils.is_proper_list(code);
        if (!count){
            return "ERROR:syntax_error <begin>";
        }
        return false;
    }
    this.convert = function(code,env,next_converter){
        //サイズが0のケース
        if (!code.cdr){
            return Syntax_converter.Share_object.undef;
        }
        //サイズが1のケース
        if (!code.cdr.cdr){
            return next_converter(code.cdr.car,env,next_converter);
        }


        //global begin
        //
        
        //未実装(今のところlocalmodeで動作)

        //local begin
        var expressions  = code.cdr;
        if (!expressions){
            return Syntax_converter.Share_object.undef;
        }else if (!expressions.cdr ){
            return expressions.car;
        }else{
            var cell = new Lexer.Pair(null,null);
            var head = cell;
            while (expressions.cdr){
                var new_cell = new Lexer.Pair(null,null);

                cell.car = Syntax_converter.utils.generate_let([[new Lexer.Token("symbol","null",-1),expressions.car]],new_cell);
                cell = new_cell;
                expressions = expressions.cdr;
            }
            cell.car = expressions.car;
            
            var ret = next_converter(head.car,env,next_converter);
            return ret;
        }
    }
}



Syntax_converter.Syntax.quote = function(){
    this.syntax_check = function(code){
        var count = Syntax_converter.utils.is_proper_list(code);
        if (count!=2){
            return "ERROR:syntax_error <quote>";
        }
        return false;
    }
    this.convert = function(code,env,next_converter){
      //
      // number , string , char などはquoteを外す(後で実装する)
      //
      return code;
    }
}

Syntax_converter.Syntax.quasiquote = function(){
    this.syntax_check = function(){
        return false;
    }

    this.convert = function(code,env,next_converter){
        list_write(code);
        exit();
        return code;
    }
}



Syntax_converter.Syntax.if = function(){
    this.syntax_check = function(code){
      var count = Syntax_converter.utils.is_proper_list(code);
      if (count != 3 && count != 4){
           return "ERROR:syntax_error <if>";
      }
      this.state = count;
      return false;
    
    }

    this.convert = function(code,env,next_converter){
        var test_expression =  next_converter(code.cdr.car,env);
        var consequent_expression =  next_converter(code.cdr.cdr.car,env);
        var ope = Syntax_converter.Share_object.if_token;
        if (code.cdr.cdr.cdr){
            var alternate_expression = next_converter(code.cdr.cdr.cdr.car,env);
            return Syntax_converter.utils.generate_proper_list([ope,test_expression,consequent_expression,alternate_expression]);
        }else{
            var alternate_expression = Syntax_converter.Share_object.undef;
            return Syntax_converter.utils.generate_proper_list([ope,test_expression,consequent_expression,alternate_expression]);
        }
    }
}

Syntax_converter.Syntax.define = function(){
    this.syntax_check = function(code){
        var count = Syntax_converter.utils.is_proper_list(code);
        if (count < 2){
            return "ERROR:syntax_error <define>";
        }
        var second_expression = code.cdr.car;
        if (second_expression.type == "pair"){
            return false;
        }else if (second_expression.type == "symbol"){
            if (count != 3){
                return "ERROR:syntax_error <define>";
            }
            return false;
        }else{
            return "ERROR:syntax_error <define>";
        }
    }

    this.convert = function(code,env,next_converter){
        //内部define ここで対処するか??
        if (code.cdr.car.type == "symbol"){
            var body = next_converter(code.cdr.cdr.car,env);
            env.set_global(code.cdr.car.data,true);
            return new Lexer.Pair(Syntax_converter.Share_object.define_token,new Lexer.Pair(code.cdr.car,new Lexer.Pair(body,null)));
        }else if (code.cdr.car.type == "pair"){
            var sym = code.cdr.car.car;
            var args = code.cdr.car.cdr;
            var bodies = code.cdr.cdr;
            env.set_global(sym.data,true);
            var lmd = new Lexer.Pair(Syntax_converter.Share_object.lambda,
                        new Lexer.Pair(args,bodies));
            lmd = next_converter(lmd,env);
            return new Lexer.Pair(Syntax_converter.Share_object.define_token,
                    new Lexer.Pair(sym,
                        new Lexer.Pair(lmd,null)));
        }
    }
}



Syntax_converter.Syntax.seti = function(){
    this.syntax_check = function(code){
        var count = Syntax_converter.utils.is_proper_list(code);
        if (count != 3){
            return "ERROR:syntax_error <set!>";
        }
        return false;
    }

    this.convert = function(code,env,next_converter){
        var body = next_converter(code.cdr.cdr.car,env,next_converter);
        return new Lexer.Pair(Syntax_converter.Share_object.seti_token,
                new Lexer.Pair(code.cdr.car,
                    new Lexer.Pair(body,null)));

    }
}



Syntax_converter.Syntax.Syntax_rules_wrapper = function(name,syntax_rules_obj,r_env){
    this.name = name;
    this.syntax_rules_obj = syntax_rules_obj;
    this.r_env = r_env;
    this.cnt = 0;
    this.syntax_check = function(code){
        return false;
    }
    this.convert = function(code,env,next_converter){
        console.log("SYNTAX_RULES_CONVER");
        this.cnt += 1;
        var ret = Syntax_rules.match_and_convert(this.syntax_rules_obj,code,this.r_env,this.cnt);
        console.log(ret);
        list_write(ret);
        ret = next_converter(ret,env);
        list_write(ret);
        print_red("CONV");
        Syntax_rules.hygenic_convert(ret);
        this.cnt -= 1;
        return ret;
    }
}




Syntax_converter.Syntax.define_syntax = function(){
    this.syntax_check = function(code){
        var count = Syntax_converter.utils.is_proper_list(code);
        if (!count || count < 2){
            return "ERROR:syntax error <define-syntax>";
        }
        return false;
    }

    this.convert = function(code,env,next_converter){
        console.log("RULES",Syntax_rules);
        var syntax_rules_obj = Syntax_rules.convert_rules(code.cdr.cdr.car);

        if (typeof syntax_rules_obj == "string"){
            //error
            return;
        }

        var syntax_name = code.cdr.car.data;
        var cloned_env = env.clone();

        env.global_syntax[syntax_name] = new Syntax_converter.Syntax.Syntax_rules_wrapper(syntax_name,syntax_rules_obj,cloned_env);
        return null;
    }
}







//4.1.7

Syntax_converter.Syntax.include = function(reader){
    this.reader = reader;

    this.syntax_check = function(code){
        return false;   
    }

    this.convert = function(code,env,next_converter){
        var cell = code.cdr;
        while (cell){
            var fname = cell.car.data;
            console.log(">>",fname);
            cell = cell.cdr;
        }


        exit();
    }
}



//4.2.1


Syntax_converter.Syntax.cond = function(){
    this.syntax_check = function(code){
        return false;
    }
    
    this.convert = function(code,env,next_converter){
        var clause = code.cdr.car;           

        var clause_head = code.cdr.car.car;
        if (clause_head.type == "symbol"){
            var q = env.search_syntax(clause_head.data);
            if (q && q.type == "else"){
                return Syntax_converter.Share_object.begin_converter.convert(clause,env,next_converter);    
            }
        }
            
        var next_cond = null;
        if (code.cdr.cdr){
            next_cond = new Lexer.Pair(code.car,code.cdr.cdr);
            next_cond = this.convert(next_cond,env,next_converter);
        }
        

        var undef  = Syntax_converter.Share_object.undef;
        if (clause.type == "pair"){
            var tmp_symbol = new Lexer.Token("symbol","tmp",-1);
            var v1 = new Syntax_rules.Symbol_env(tmp_symbol,null,-1,0);
            var v2 = new Syntax_rules.Symbol_env(tmp_symbol,null,-1,0);
            var v3 = new Syntax_rules.Symbol_env(tmp_symbol,null,-1,0);


            if (clause.cdr && clause.cdr.cdr && clause.cdr.car.type == "symbol"){
                var center = env.search_syntax(clause.cdr.car.data);
                if (center.type == "=>"){
                    var test = next_converter(clause.car,env);
                    var result = next_converter(clause.cdr.cdr.car,env);
                    
                    if (next_cond){
                        var if_expression = new Lexer.Pair(Syntax_converter.Share_object.if,new Lexer.Pair(v2,new Lexer.Pair(new Lexer.Pair(result,new Lexer.Pair(v1,null)),new Lexer.Pair(next_cond,null))));
                        var lambda_expression = Syntax_converter.utils.generate_lambda([v3],new Lexer.Pair(if_expression,null));
                        Syntax_rules.hygenic_convert(lambda_expression);
                        var ret = new Lexer.Pair(lambda_expression,new Lexer.Pair(test,null));
                        return ret;
                    }else{
                        var if_expression = new Lexer.Pair(Syntax_converter.Share_object.if,new Lexer.Pair(v2,new Lexer.Pair(new Lexer.Pair(result,new Lexer.Pair(v1,null)),new Lexer.Pair(undef,null))));
                        var lambda_expression = Syntax_converter.utils.generate_lambda([v3],new Lexer.Pair(if_expression,null));
                        Syntax_rules.hygenic_convert(lambda_expression);
                        var ret = new Lexer.Pair(lambda_expression,new Lexer.Pair(test,null));
                        return ret;
                    }
                }
            }

            if (!clause.cdr){
                if (next_cond){
                    var if_expression = new Lexer.Pair(Syntax_converter.Share_object.if,new Lexer.Pair(v2,new Lexer.Pair(v2,new Lexer.Pair(next_cond,null))));
                    var lambda_expression = Syntax_converter.utils.generate_lambda([v3],new Lexer.Pair(if_expression,null));
                    Syntax_rules.hygenic_convert(lambda_expression);
                    var ret = new Lexer.Pair(lambda_expression,new Lexer.Pair(clause.car,null));
                    return ret;
                }else{
                    return clause.car;
                }
            }
            
            var test = next_converter(clause.car,env);
            var begin_expression = Syntax_converter.Share_object.begin_converter.convert(new Lexer.Pair("BEGIN-DAYO!",clause.cdr),env,next_converter);


            if (next_cond){
                var if_expression = new Lexer.Pair(Syntax_converter.Share_object.if,new Lexer.Pair(test,new Lexer.Pair(begin_expression,new Lexer.Pair(next_cond,null))));
                return if_expression;
            }else{
                var if_expression = new Lexer.Pair(Syntax_converter.Share_object.if,new Lexer.Pair(test,new Lexer.Pair(begin_expression,new Lexer.Pair(undef,null))));
                return if_expression;
            }
        }
        error();
    }
}




//case

//and
Syntax_converter.Syntax.and = function(){
    this.syntax_check = function(code){
        return false;
    }

    this.convert = function(code,env,next_converter){
        if (!code.cdr){
            return Syntax_converter.Share_object.true;
        }else if (!code.cdr.cdr){
            return next_converter(code.cdr.car,env);
        }else{
            var next_and = new Lexer.Pair(code.car,code.cdr.cdr);
            next_and = this.convert(next_and,env,next_converter);
            
            var test = next_converter(code.cdr.car,env);
            return new Lexer.Pair(Syntax_converter.Share_object.if_token,
                    new Lexer.Pair(test,
                        new Lexer.Pair(next_and,
                            new Lexer.Pair(Syntax_converter.Share_object.false,null))));
        }
    }
}

Syntax_converter.Syntax.or  = function(){
    this.syntax_check = function(code){
        return false;
    }

    this.convert = function(code,env,next_converter){
        if (!code.cdr){
            return Syntax_converter.Share_object.false;
        }else if (!code.cdr.cdr){
            return next_converter(code.cdr.car,env);
        }else{
            var next_or = new Lexer.Pair(code.car,code.cdr.cdr);
            next_or = this.convert(next_or,env,next_converter);
            
            var tmp_symbol = new Lexer.Token("symbol","tmp",-1);
            var v1 = new Syntax_rules.Symbol_env(tmp_symbol,null,-1,0);
            var v2 = new Syntax_rules.Symbol_env(tmp_symbol,null,-1,0);
            var if_expression = new Lexer.Pair(Syntax_converter.Share_object.if,new Lexer.Pair(v1,new Lexer.Pair(v1,new Lexer.Pair(next_or,null))));
            var lambda_expression = Syntax_converter.utils.generate_lambda([v2],new Lexer.Pair(if_expression,null));
            lambda_expression = next_converter(lambda_expression,env);
            Syntax_rules.hygenic_convert(lambda_expression);
            
            var func_run = new Lexer.Pair(lambda_expression,new Lexer.Pair(code.cdr.car,null));
            return func_run;
        }   
    }
}

Syntax_converter.Syntax.when = function(){
    this.syntax_check = function(code){
        if (!code.cdr && !code.cdr.cdr){
            return "ERROR:syntax error <when>";
        }
        return false;
    }

    this.convert = function(code,env,next_converter){
        var test = next_converter(code.cdr.car,env);
        var cell = code.cdr.cdr;
        var new_body = new Lexer.Pair(null,null);
        var new_body_head = new_body;
        while (cell){
            new_body.cdr = new Lexer.Pair(next_converter(cell.car,env),null);
            new_body = new_body.cdr;
            cell = cell.cdr;
        }
        new_body = Syntax_converter.Share_object.begin_converter.convert(new_body_head,env,next_converter);
        return new Lexer.Pair(Syntax_converter.Share_object.if_token,new Lexer.Pair(test,new Lexer.Pair(new_body,new Lexer.Pair(Syntax_converter.Share_object.undef,null))));
    }
}

Syntax_converter.Syntax.unless = function(){
    this.syntax_check = function(code){
        if (!code.cdr && !code.cdr.cdr){
            return "ERROR:syntax error <unless>";
        }
        return false;
    }

    this.convert = function(code,env,next_converter){
        var test = next_converter(code.cdr.car,env);
        var cell = code.cdr.cdr;
        var new_body = new Lexer.Pair(null,null);
        var new_body_head = new_body;
        while (cell){
            new_body.cdr = new Lexer.Pair(next_converter(cell.car,env),null);
            new_body = new_body.cdr;
            cell = cell.cdr;
        }
        new_body = Syntax_converter.Share_object.begin_converter.convert(new_body_head,env,next_converter);
        return new Lexer.Pair(Syntax_converter.Share_object.if_token,new Lexer.Pair(test,new Lexer.Pair(Syntax_converter.Share_object.undef,new Lexer.Pair(new_body,null))));
    }
}



Syntax_converter.Syntax.cond_expand = function(){
    this.syntax_check = function(code){
        return fallse;
    }

    this.convert = function(code,env,next_converter){
        return null;
    }
}







//4.2.2



Syntax_converter.Syntax.let = function(){
    this.syntax_check = function(code){
        var count = Syntax_converter.utils.is_proper_list(code);
        if (!count || count < 2){
            return "ERROR:syntax error <let>";
        }
        return false;
    }

    this.convert = function(code,env,next_converter){

        if (code.cdr.car && code.cdr.car.type == "symbol"){
            //named let

            var name = code.cdr.car;
            var bindings = code.cdr.cdr.car;

            var lambda_formals = [];

            var apply_cell = new Lexer.Pair(name,null);
            var apply_cell_head = apply_cell;

            while (bindings){
                lambda_formals.push(bindings.car.car);
                //apply_args.push(bindings.car.cdr.car);
                apply_cell.cdr = new Lexer.Pair(bindings.car.cdr.car,null);
                apply_cell = apply_cell.cdr;
                bindings = bindings.cdr;
            }

            var bodies = code.cdr.cdr.cdr;

            var lmd = Syntax_converter.utils.generate_lambda(lambda_formals,bodies);
            lmd = Syntax_converter.Share_object.lambda_converter.convert(lmd,env,next_converter);

            var letrec_code = new Lexer.Pair("letrec",new Lexer.Pair(new Lexer.Pair(new Lexer.Pair(name,new Lexer.Pair(lmd,null))),new Lexer.Pair(apply_cell_head,null)));
            letrec_code = Syntax_converter.Share_object.letrec_converter.convert(letrec_code,env,next_converter);
            return letrec_code;
        }else{
            //normal let
            //(let ((a1 b1) (a2 b2) ...) bodies) =>  ((lambda (a1 a2 ... ) bodies ... ) b1 b2 ... )
            var bindings = code.cdr.car;
            /*
            if (!bindings){
              return code.cdr.cdr.car;
            }*/


            var lambda_formals = [];
            var apply_args = [];
            while (bindings){
                lambda_formals.push(bindings.car.car);
                apply_args.push(bindings.car.cdr.car);
                bindings = bindings.cdr;
            }
            
            //
            // bodyの展開はSyntax_converter.Syntax.lambdaに任せる
            //
            //

            //var body = next_converter(code.cdr.cdr.car,env);
            var bodies = code.cdr.cdr;

            
            //var lmd = Syntax_converter.utils.generate_lambda(lambda_formals,new Lexer.Pair(body,null));
            var lmd = Syntax_converter.utils.generate_lambda(lambda_formals,bodies);
            lmd = Syntax_converter.Share_object.lambda_converter.convert(lmd,env,next_converter);

            var ret_cell =  new Lexer.Pair(lmd,null);
            var ret_cell_head = ret_cell;
            for (var i=0;i<apply_args.length;i++){
                ret_cell.cdr = new Lexer.Pair(apply_args[i],null);
                ret_cell = ret_cell.cdr;
            }
            return next_converter(ret_cell_head,env);
        }
    }
}


Syntax_converter.Syntax.let_star = function(){
    //let*
    this.syntax_check = Syntax_converter.Share_object.let_converter.syntax_check;
    this.convert = function(code,env,next_converter){
      
        if (code.cdr.car == null){
          var rr =  Syntax_converter.Share_object.let_converter.convert(new Lexer.Pair(code.car,
                                          new Lexer.Pair(null,code.cdr.cdr)),env,next_converter);
          return rr;
        }else{
          var next = new Lexer.Pair(code.car,
                        new Lexer.Pair(code.cdr.car.cdr,code.cdr.cdr));

          return Syntax_converter.Share_object.let_converter.convert(new Lexer.Pair(code.car,
                 new Lexer.Pair(new Lexer.Pair(code.cdr.car.car,null),new Lexer.Pair(next,null) )),env,next_converter);
        }
    }
}




Syntax_converter.Syntax.letrec = function(){
    this.syntax_check =  function(code){
        return null;
    }

    this.convert = function(code,env,next_converter){
        var bindings = code.cdr.car;

        var new_bindings = new Lexer.Pair(null,null);
        var cell = bindings;;
        var nb_head = new_bindings;
        while (cell){
            new_bindings.cdr = new Lexer.Pair(new Lexer.Pair(cell.car.car,new Lexer.Pair(Syntax_converter.Share_object.undef,null)),null);
            new_bindings = new_bindings.cdr;
            cell = cell.cdr;
        }
        new_bindings = nb_head.cdr;

        cell = bindings;;
        var new_body = new Lexer.Pair(null,null);
        nb_head = new_body;
        while (cell){
            var seti_exp = new Lexer.Pair("set!",new Lexer.Pair(cell.car.car,new Lexer.Pair(cell.car.cdr.car,null)));
            seti_exp = Syntax_converter.Share_object.seti_converter.convert(seti_exp,env,next_converter);
            new_body.cdr = new Lexer.Pair(seti_exp,null);
            new_body = new_body.cdr;
            cell = cell.cdr;
        }
        new_body.cdr = new Lexer.Pair(code.cdr.cdr.car,null);
        new_body = nb_head.cdr;
        
        var let_expression = Syntax_converter.Share_object.let_converter.convert(new Lexer.Pair("let",new Lexer.Pair(new_bindings,new_body)),env,next_converter);
        return let_expression;
    }
}



Syntax_converter.Syntax.letrec_star = function(){
    //let*
    this.syntax_check = Syntax_converter.Share_object.let_converter.syntax_check;
    this.convert = function(code,env,next_converter){
      
        if (code.cdr.car == null){
          var rr =  Syntax_converter.Share_object.let_converter.convert(new Lexer.Pair(code.car,
                                          new Lexer.Pair(null,code.cdr.cdr)),env,next_converter);
          return rr;
        }else{
          var next = new Lexer.Pair(code.car,
                        new Lexer.Pair(code.cdr.car.cdr,code.cdr.cdr));

          return Syntax_converter.Share_object.letrec_converter.convert(new Lexer.Pair(code.car,
                 new Lexer.Pair(new Lexer.Pair(code.cdr.car.car,null),new Lexer.Pair(next,null) )),env,next_converter);
        }
    }
}




Syntax_converter.Syntax.let_values = function(){
    this.syntax_check = function(code){
      return false;
    }

    this.tmp_convert = function(x,y,args,bindings,tmp,body,env,next_converter,cnt){
        if (!x){
            var lmd1 = new Lexer.Pair("lmd",new Lexer.Pair(null,new Lexer.Pair(y,null)));
            lmd1 = Syntax_converter.Share_object.lambda_converter.convert(lmd1,env,next_converter);
            var next = this.bind_convert(bindings,tmp,body,env,next_converter,cnt+1);
            var lmd2 = new Lexer.Pair("lmd",new Lexer.Pair(args,new Lexer.Pair(next,null)));
            lmd2 = Syntax_converter.Share_object.lambda_converter.convert(lmd2,env,next_converter);
            
            var ret = new Lexer.Pair(new Lexer.Token("symbol","call-with-values",-1),new Lexer.Pair(lmd1,new Lexer.Pair(lmd2,null)));
            return ret;   
        }else if (x.type == "pair"){
            //argsはコピー済みであること
            var cell = args;
            while (cell && cell.cdr){
                cell = cell.cdr;
            }
            var tmp_sym = new Lexer.Token("symbol","tmp",-1);
            var tmp_symbol = new Syntax_rules.Symbol_env(tmp_sym,null,-1,cnt+1);
            var tmp_symbol2 = new Syntax_rules.Symbol_env(tmp_sym,null,-1,cnt+1);
            if (cell){
                cell.cdr = new Lexer.Pair(tmp_symbol,null);
            }else{
                args = new Lexer.Pair(tmp_symbol,null);
            }
            
            cell = tmp;
            while (cell && cell.cdr){
                cell = cell.cdr;
            }
            if (cell){
                cell.cdr = new Lexer.Pair(new Lexer.Pair(x.car,new Lexer.Pair(tmp_symbol2,null)),null);
            }else{
                tmp = new Lexer.Pair(new Lexer.Pair(x.car,new Lexer.Pair(tmp_symbol2,null)),null);
            }
            return this.tmp_convert(x.cdr,y,args,bindings,tmp,body,env,next_converter,cnt+1);
        }else if (x.type == "symbol"){
            var lmd1 = new Lexer.Pair("lmd",new Lexer.Pair(null,new Lexer.Pair(y,null)));
            lmd1 = Syntax_converter.Share_object.lambda_converter.convert(lmd1,env,next_converter);
            
            var tmp_sym = new Lexer.Token("symbol","tmp",-1);
            var tmp_symbol = new Syntax_rules.Symbol_env(tmp_sym,null,-1,cnt+1);
            var tmp_symbol2 = new Syntax_rules.Symbol_env(tmp_sym,null,-1,cnt+1);


            var cell = args;
            while (cell && cell.cdr){
                cell = cell.cdr;
            }
            if (cell){
                cell.cdr = tmp_symbol;
            }else{
                args = tmp_symbol;
            }
            
            cell = tmp;
            while (cell && cell.cdr){
                cell = cell.cdr;
            }
            if (cell){
                cell.cdr = new Lexer.Pair(new Lexer.Pair(x,new Lexer.Pair(tmp_symbol2,null)),null);
            }else{
                tmp = new Lexer.Pair(new Lexer.Pair(x,new Lexer.Pair(tmp_symbol2,null)),null);
            }


            var next = this.bind_convert(bindings,tmp,body,env,next_converter,cnt+1);

            var lmd2 = new Lexer.Pair("lmd",new Lexer.Pair(args,new Lexer.Pair(next,null)));
            lmd2 = Syntax_converter.Share_object.lambda_converter.convert(lmd2,env,next_converter);
            
            var ret = new Lexer.Pair(new Lexer.Token("symbol","call-with-values",-1),new Lexer.Pair(lmd1,new Lexer.Pair(lmd2,null)));
            return ret;   
        }else{
            //err;
        }

    }


    this.bind_convert = function(z,tmp,body,env,next_converter,cnt){
        if (z){
            var bind_a = z.car.car;
            var bind_b = z.car.cdr.car;
            return this.tmp_convert(bind_a,bind_b,null,z.cdr,tmp,body,env,next_converter,cnt+1);
        }else{
            var let_expression = new Lexer.Pair("LET",new Lexer.Pair(tmp,new Lexer.Pair(body)));
            return Syntax_converter.Share_object.let_converter.convert(let_expression,env,next_converter);
        }
    }


    this.convert = function(code,env,next_converter){
        //Syntax_converter.Scheme_symbol           
        
        var body = Syntax_converter.Share_object.begin_converter.convert(new Lexer.Pair("BEGIN",code.cdr.cdr),env,next_converter);
        
        var ret = this.bind_convert(code.cdr.car,null,body,env,next_converter,0);
        
        Syntax_rules.hygenic_convert(ret);
        return ret;
    }
}

Syntax_converter.Syntax.let_star_values = function(){
    this.syntax_check = function(code){
        return false;
    }

    this.convert = function(code,env,next_converter){
        if (!code.cdr.car){
            var body = Syntax_converter.Share_object.begin_converter.convert(new Lexer.Pair("I AM BEGIN",code.cdr.cdr),env,next_converter);
            return body;    
        }else{
            var next = this.convert(new Lexer.Pair("I AM LET*-VALUES",new Lexer.Pair(code.cdr.car.cdr,code.cdr.cdr)),env,next_converter);
            var ret = Syntax_converter.Share_object.let_values_converter.convert(
                    new Lexer.Pair("I AM LET-VALUES",new Lexer.Pair(new Lexer.Pair(code.cdr.car.car,null),new Lexer.Pair(next,null))),env,next_converter);
            return ret;
        }
    }

}







//4.3.1

Syntax_converter.Syntax.let_syntax = function(){
    this.syntax_check = function(code){
        return false;
    }

    this.convert = function(code,env,next_converter){
        var syntax_cell = code.cdr.car;
        
        var cloned_env = env.clone();
        var frame = new Syntax_converter.Syntax_frame();
        while (syntax_cell){
            console.log(syntax_cell.car.car);       
            var syntax_name = syntax_cell.car.car.data;
            var syntax_data = syntax_cell.car.cdr.car;
            var syntax_obj = Syntax_rules.convert_rules(syntax_data);
            frame.push(syntax_name,new Syntax_converter.Syntax.Syntax_rules_wrapper(syntax_name,syntax_obj,cloned_env));
            syntax_cell = syntax_cell.cdr;
        }
        env.push_frame(frame);
        var body = code.cdr.cdr.car;
        var ret = next_converter(body,env);
        env.pop_frame();
        return ret;

    }
}

Syntax_converter.Syntax.letrec_syntax = function(){
    this.syntax_check = function(code){
        return false;
    }

    this.convert = function(code,env,next_converter){
        var syntax_cell = code.cdr.car;
        
        var cloned_env = env.clone();
        var frame = new Syntax_converter.Syntax_frame();
        while (syntax_cell){
            console.log(syntax_cell.car.car);       
            var syntax_name = syntax_cell.car.car.data;
            var syntax_data = syntax_cell.car.cdr.car;
            var syntax_obj = Syntax_rules.convert_rules(syntax_data);
            frame.push(syntax_name,new Syntax_converter.Syntax.Syntax_rules_wrapper(syntax_name,syntax_obj,cloned_env));
            syntax_cell = syntax_cell.cdr;
        }
        cloned_env.push_frame(frame);
        env.push_frame(frame);
        var body = code.cdr.cdr.car;
        var ret = next_converter(body,env);
        env.pop_frame();
        return ret;

    }
}





//4.3.3
Syntax_converter.Syntax.syntax_error = function(){
    this.syntax_check = function(code){
        return code.cdr.car.data;
    }

    this.convert = function(code,env,next_converter){
        return null;
    }
}






Syntax_converter.Syntax.import = function(){
    this.syntax_check = function(code){
        
        return false;
    }

    this.convert = function(code,env,next_converter){
        
        console.log("IMPORT");
        exit();
    }
}



Syntax_converter.Syntax.define_library = function(){
   this.syntax_check = function(code){
       return false;
   }


   this.convert = function(code,env,next_converter){
       var library_name = code.cdr.car;
       var new_env = new Syntax_converter.Env.Syntax_Env();


       exit();
   }
}


//
//  SYMBOLS(else =>) 
//
Syntax_converter.Syntax.else = function(){
    this.type = "else";
}

Syntax_converter.Syntax.right_arrow = function(){
    this.type = "=>";
}




Syntax_converter.Syntax.apply = function(code,env,next_converter){
    var apply_cell = new Lexer.Pair(null,null);
    var apply_cell_head = apply_cell;
    var cell = code;
    while (cell){
        apply_cell.cdr = new Lexer.Pair(Syntax_converter.Syntax_convert(cell.car,env),null);
        apply_cell = apply_cell.cdr;
        cell = cell.cdr;
    }
    return apply_cell_head.cdr;       
}



//
//
// SHARE OBJECT
//
//


Syntax_converter.Share_object.let = new Lexer.Token("symbol","let",-1);
Syntax_converter.Share_object.lambda = new Lexer.Token("symbol","lambda",-1);
Syntax_converter.Share_object.if = new Lexer.Token("symbol","if",-1);
Syntax_converter.Share_object.define = new Lexer.Token("symbol","define",-1);
Syntax_converter.Share_object.seti= new Lexer.Token("symbol","set!",-1);

Syntax_converter.Share_object.undef = new Lexer.Token("undefined","#undef",-1);
Syntax_converter.Share_object.true = new Lexer.Token("bool","#t",-1);
Syntax_converter.Share_object.false = new Lexer.Token("bool","#f",-1);


Syntax_converter.Share_object.lambda_token = new Syntax_converter.Syntax.Syntax_token("lambda");
Syntax_converter.Share_object.if_token = new Syntax_converter.Syntax.Syntax_token("if");
Syntax_converter.Share_object.define_token = new Syntax_converter.Syntax.Syntax_token("define");
Syntax_converter.Share_object.seti_token = new Syntax_converter.Syntax.Syntax_token("set!");


Syntax_converter.Share_object.begin_converter = new Syntax_converter.Syntax.begin();
Syntax_converter.Share_object.lambda_converter = new Syntax_converter.Syntax.lambda();
Syntax_converter.Share_object.let_converter = new Syntax_converter.Syntax.let();
Syntax_converter.Share_object.letrec_converter = new Syntax_converter.Syntax.letrec();
Syntax_converter.Share_object.seti_converter = new Syntax_converter.Syntax.seti();
Syntax_converter.Share_object.let_values_converter = new Syntax_converter.Syntax.let_values();

//
//ENV
//
//
//


Syntax_converter.Env.Syntax_Env = function(){
    this.global_syntax = {};
    this.global = {};

    this.locals = [];

    this.search_syntax = function(syntax_name){
        //local search
        for (var i=this.locals.length-1;i>-1;i--){
            var frame = this.locals[i];
            if (frame.type == "syntax"){
                if (frame.syntax[syntax_name]){
                    return frame.syntax[syntax_name];
                }
            }
        }   
        
        if (this.global_syntax[syntax_name]){
            return this.global_syntax[syntax_name];
        }
        return false;
    }

    this.search = function(name){
        //local search
        //あとで実装
        if (this.global[name]){
            return this.global[name];
        }
        return null;
    }

    this.push_frame = function(frame){
        this.locals.push(frame);
    }

    this.pop_frame = function(frame){
        this.locals.pop(frame);
    }
    
    this.set_global = function(sym,data){
        this.global[sym] = data;
    }

    this.clone = function(){
        var cloned_env = new Syntax_converter.Env.Syntax_Env();
        cloned_env.global_syntax = this.global_syntax;
        for (var i=0;i<this.locals.length;i++){
            cloned_env.locals.push(this.locals[i]);
        }
        return cloned_env;
    }
}



Syntax_converter.Syntax_frame = function(){
    this.type = "syntax";
    this.syntax ={};
    this.push = function(name,syntax){
        this.syntax[name] = syntax;
    }
}


Syntax_converter.set_r7rs_scheme_base = function(env){

    env.global_syntax["import"] = new Syntax_converter.Syntax.import();
    env.global_syntax["define-library"] = new Syntax_converter.Syntax.define_library();
 
    //4.1.2
    env.global_syntax["quote"] = new Syntax_converter.Syntax.quote();

    //4.1.4
    env.global_syntax["lambda"] = new Syntax_converter.Syntax.lambda();

    //4.1.5
    env.global_syntax["if"] = new Syntax_converter.Syntax.if();

    //4.1.6
    env.global_syntax["set!"] = new Syntax_converter.Syntax.seti();
    
    //4.1.7
    //include include-ci
    env.global_syntax["include"] = new Syntax_converter.Syntax.include();


    //4.2.1
    //cond case
    env.global_syntax["cond"] = new Syntax_converter.Syntax.cond();
    env.global_syntax["and"] = new Syntax_converter.Syntax.and();
    env.global_syntax["or"] = new Syntax_converter.Syntax.or();
    env.global_syntax["when"] = new Syntax_converter.Syntax.when();
    env.global_syntax["unless"] = new Syntax_converter.Syntax.unless();
    env.global_syntax["cond-expand"] = new Syntax_converter.Syntax.cond_expand();

    //4.2.2
    env.global_syntax["let"] = new Syntax_converter.Syntax.let();
    env.global_syntax["letrec"] = new Syntax_converter.Syntax.letrec();
    env.global_syntax["let*"] = new Syntax_converter.Syntax.let_star();
    env.global_syntax["letrec*"] = new Syntax_converter.Syntax.letrec_star();
    env.global_syntax["let-values"] = new Syntax_converter.Syntax.let_values();
    env.global_syntax["let*-values"] = new Syntax_converter.Syntax.let_star_values();
    
    //4.2.3
    env.global_syntax["begin"] = new Syntax_converter.Syntax.begin();

    //4.2.4
    //do

    //4.2.5
    //delay(scheme delay)
    
    //4.2.6
    //quasiquote
    env.global_syntax["quasiquote"] = new Syntax_converter.Syntax.quasiquote();

    //4.3.1
    env.global_syntax["let-syntax"] = new Syntax_converter.Syntax.let_syntax();
    env.global_syntax["letrec-syntax"] = new Syntax_converter.Syntax.letrec_syntax();
    //4.3.3
    env.global_syntax["syntax-error"] = new Syntax_converter.Syntax.syntax_error();

    //5.3
    env.global_syntax["define"] = new Syntax_converter.Syntax.define();

    //5.4
    env.global_syntax["define-syntax"] = new Syntax_converter.Syntax.define_syntax();


    //symbols
    env.global_syntax["else"] = new Syntax_converter.Syntax.else();
    env.global_syntax["=>"] = new Syntax_converter.Syntax.right_arrow();
}




Syntax_converter.set_scheme_r5rs = function(env){

}










Syntax_converter.create_env = function(){
    var env = new Syntax_converter.Env.Syntax_Env();
    Syntax_converter.set_r7rs_scheme_base(env);
    return env;
}




Syntax_converter.Syntax_convert = function(code,env){
    if (code.type == "pair"){
        var opecode = code.car;
        if (opecode.type == "pair"){
            return Syntax_converter.Syntax.apply(code,env,Syntax_converter.Syntax_convert);
        }else if (opecode.type == "symbol"){
            var syntax = env.search_syntax(opecode.data);   

            if (syntax){
                var check = syntax.syntax_check(code);
                if (check){
                    console.log(check);
                    
                    return null;
                }
                return syntax.convert(code,env,Syntax_converter.Syntax_convert);

            }else{
                //func run
                return Syntax_converter.Syntax.apply(code,env,Syntax_converter.Syntax_convert);
            }
        }else if (opecode.type == "symbol-env"){
            //syntax-rulesで退避したsymbolを展開する
            var saved_env = opecode.env;
            var syntax = saved_env.search_syntax(opecode.data);
            if (syntax){
                if (syntax.syntax_check(code)){
                    console.log("ERROR");
                    return null;
                }
                return syntax.convert(code,env,Syntax_converter.Syntax_convert);
            }else{
                return Syntax_converter.Syntax.apply(code,env,Syntax_converter.Syntax_convert);
            }
        }else if (opecode.type == "syntax"){
            return code;
        }
    }else{
        return code;
    }

}


















Syntax_converter.Alpha_renaming.alpha_renaming = function(code,env){
    function gen_sym(original_symbol,renames){
        for (var i=0;i<10000;i++){
            var new_symbol = original_symbol + "$" + i;
            if (!renames[new_symbol]){
                return new_symbol;
            }
        }
        //ERROR
        ERRRRRROR();
        return null;
    }

        


    var lambda_body_pairs = [];

    function loop(code,renames){
        if (!code){
            return code;
        }
        if (code.type != "pair"){
            if (code.type == "symbol"){
                var sym = code.data;
                if (renames[sym]){
                    code.data = renames[sym];
                    return new Lexer.Token("symbol",renames[sym],-1);
                }
            }else if (code.type == "symbol-env"){
                code.type = "symbol";
                code.env = null;

            }
            return code;
        }else{

            var opecode = code.car;
            if (opecode.type == "syntax"){
                if (opecode.data == "lambda"){

                    var form_syms = [];
                    var cell = code.cdr.car;
                    if (cell){
                        while (cell){
                            if (cell.type != "pair"){
                                form_syms.push(cell.car);
                                break;
                            }
                            form_syms.push(cell.car.data);
                            cell = cell.cdr;
                        }
                    }

                    var saved_symbol = [];
                    for (var i=0;i<form_syms.length;i++){
                        if (env.search(form_syms[i]) || renames[form_syms[i]]){
                            saved_symbol.push(renames[form_syms.push]);
                            var new_symbol = gen_sym(form_syms[i],renames);
                            renames[form_syms[i]] = new_symbol;
                        }else{
                            saved_symbol.push(false);
                            renames[form_syms[i]] = form_syms[i];
                        }
                    }

                    cell = new Lexer.Pair(null,code.cdr.car);
                    
                    while (cell.cdr){
                        if (cell.cdr.type != "pair"){
                            cell.cdr = loop(cell.cdr,renames);
                            break;
                        }
                        cell.cdr.car = loop(cell.cdr.car,renames);
                        
                        cell = cell.cdr;
                    }

                    //body conversion
                    lambda_body_pairs.push(code.cdr.cdr);
                    code.cdr.cdr.car = loop(code.cdr.cdr.car,renames);
                    lambda_body_pairs.pop();

                    for (var i=0;i<form_syms.length;i++){
                        renames[form_syms[i]] = saved_symbol[i];
                    }
                    code.car = Syntax_converter.Share_object.lambda;
                    return code;
                }else if (opecode.data == "define"){
                    if (lambda_body_pairs.length){
                        var name = code.cdr.car.data;
                        //convert_def_body(name);
                        opecode.data = "set!";
                        exit();
                    }else{
                        code.cdr.cdr.car = loop(code.cdr.cdr.car,renames);
                        code.car = Syntax_converter.Share_object.define;
                    }
                    return code;
                }else if (opecode.data == "set!"){
                    code.car = Syntax_converter.Share_object.seti;
                    code.cdr.cdr.car = loop(code.cdr.cdr.car,renames);
                    return code;
                }else if (opecode.data == "if"){
                    code.car = Syntax_converter.Share_object.if;
                    code.cdr.car = loop(code.cdr.car,renames);
                    code.cdr.cdr.car = loop(code.cdr.cdr.car,renames);
                    code.cdr.cdr.cdr.car = loop(code.cdr.cdr.cdr.car,renames);
                    return code;
                }
            }else{
                var head = code;
                var cell = code;
                while (cell){
                    cell.car = loop(cell.car,renames);
                    cell = cell.cdr;
                }
                return head;
            }
        }
    }
    loop(code,{});
}




Syntax_converter.Scheme_symbol = function(data,lib){
    this.type = "scheme_symbol";
    this.data = data;
    this.lib = lib;
}

