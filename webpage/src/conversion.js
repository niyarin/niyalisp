var Conversion = {};

// for node
var is_node = typeof require !==  "undefined";
if (is_node){
    module.exports = Conversion;
    var Lexer = require("./lexer");
    var Syntax_rules = require("./syntax_rules");
}





Conversion.internal_env_create = function(){
    var ret =  {"local_stack":[],
                "local_cell_stack":[],
                "all_symbols":{},
                "renames":[],
                "in_function":0,
                 "global_syntax":{},
                 "error":[]};
    ret.all_symbols["lambda"] = true;
    return ret;
}


Conversion.gensym = function(sym,syms){
    var ret = sym + "_";
    for (var i=0;i<100;i++){
        if (!syms[sym+i]){
            return sym+i;
        }
    }   
    return null;
}



Conversion.rename = function(sym,renames){
    for (var i=renames.length-1;i>-1;i--){
        if (renames[i][sym]){
            return renames[i][sym];
        }       
    }
    return sym;
}


Conversion.array_expand = function(arr){
    var ret_cell = new Lexer.Pair(null,null);
    var front = ret_cell;
    for (var i=0;i<arr.length;i++){
        ret_cell.cdr = new Lexer.Pair(arr[i],null);
        ret_cell = ret_cell.cdr;
    }
    return front.cdr;
}





Conversion.create_let1 = function(sym,val,body){
    
    var vars = new Lexer.Pair(new Lexer.Pair(sym,new Lexer.Pair(val),-1),null);
    var letsymcell = new Lexer.Pair(new Lexer.Token("symbol","let",-1),null);

    letsymcell.cdr = new Lexer.Pair(vars,null);
    letsymcell.cdr.cdr = body;
    
    var ret = new Lexer.Pair(letsymcell,null);
    return ret;
}


Conversion.is_proper_list = function(ls){
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


Conversion.generate_syntax_error = function(txt,operator){
    var line = parseInt(operator.line.split(" ")[0]) + 1;
    var ret = new Lexer.Token("error",txt + "(line:" + line + " )");
    ret.line = line
    return ret;
}




Conversion.syntax_check = function(expression){
    var operator = expression.car.data;

    var is_proper_list = Conversion.is_proper_list(expression);
    if (! is_proper_list){
        return Conversion.generate_syntax_error("ERROR: Proper list required for syntax <" + operator + ">.",expression.car);
    }


    if (operator == "lambda"){
        if (is_proper_list < 3){
            return Conversion.generate_syntax_error("ERROR: syntax error <lambda>.",expression.car);
        }
    }else if (operator == "if"){
        if (is_proper_list < 3){
            return Conversion.generate_syntax_error("ERROR: syntax error <if>.",expression.car);
        }
    
    }else if (operator == "define"){
        if (is_proper_list < 3){
            return Conversion.generate_syntax_error("ERROR: syntax error <define>.",expression.car);
        }

        if (expression.cdr.car.type == "symbol"){
            if (is_proper_list != 3){
                return Conversion.generate_syntax_error("ERROR: syntax error <define>.",expression.car);
            }
        }else if (expression.cdr.car.type == "pair"){
            
        }else{
            return Conversion.generate_syntax_error("ERROR: syntax error <define>.",expression.car);
            
        }
    }else if (operator == "set!"){
         if (is_proper_list != 3){
            return Conversion.generate_syntax_error("ERROR: syntax error <set!>.",expression.car);
        }   
    }




    return false;
}








Conversion.syntax_converter = {};
Conversion.syntax_converter.let2lambda = function(code){
    var bindings = code.cdr.car;
    var var_list = new Lexer.Pair(null,null);
    var var_list_front = var_list;
    var init_list = new Lexer.Pair(null,null);
    var init_list_front = init_list;
    var bodies_cell = code.cdr.cdr;
    
    while (bindings){
        var_list.cdr = bindings.car;
        init_list.cdr = bindings.car.cdr;

        var_list = var_list.cdr;
        init_list = init_list.cdr;

        bindings = bindings.cdr;
    }
    var_list.cdr = null;
    init_list.cdr = null;

    var lambda_cell = new Lexer.Pair(new Lexer.Token("symbol","lambda",-1),null);
    lambda_cell.cdr = new Lexer.Pair(var_list_front.cdr,null);
    lambda_cell.cdr.cdr = bodies_cell;

    code.car = lambda_cell;
    code.cdr = init_list_front.cdr;
}



Conversion.expand_begin = function(code){
    if (code.cdr == null){
        return code.car;
    }
    var ret = 
        new Lexer.Pair(new Lexer.Token("symbol","let",-1),
                new Lexer.Pair(
                   new Lexer.Pair(new Lexer.Pair(new Lexer.Token("symbol","__null__",-1),new Lexer.Pair(code.car,null)),null),
                   new Lexer.Pair(Conversion.expand_begin(code.cdr),null)));

    return ret;
}





Conversion.internal_conversion = function(code,env){
    if (code.car.type == "pair"){

        var expression = code.car;
        var operator = expression.car;
        if (operator.type == "symbol"){
             
            operator.data = Conversion.rename(operator.data,env.renames);
            if (operator.data == "lambda"){
                var is_err = Conversion.syntax_check(expression);
                if (is_err){
                    env.error.push(is_err);
                    return new Lexer.Pair(null,null);
                }



                var vars = expression.cdr.car;
                var bodies = expression.cdr.cdr;


                var renames = {};
                {
                    var vars_cell = vars;
                    while (vars_cell){
                        var token = null;
                        if (vars_cell.type != "pair"){
                            token = vars_cell;
                            break;
                        }else{
                            token = vars_cell.car;
                        }

                        if (env.all_symbols[token.data]){
                            var new_symbol = Conversion.gensym(token.data,env.all_symbols);
                            renames[token.data] = new_symbol;
                            token.data = new_symbol;
                            env.all_symbols[new_symbol] = true;
                        }else{
                            env.all_symbols[token.data] = true;
                        }
                        vars_cell = vars_cell.cdr;
                    }
                }
                
                env.local_stack.push(vars);
                env.renames.push(renames);
                env.local_cell_stack.push(expression);
                env.in_function++;

                var begin_expression = Conversion.expand_begin(bodies);

                expression.cdr.cdr = new Lexer.Pair(begin_expression,null);

                
                Conversion.internal_conversion(expression.cdr.cdr,env);


                //env.local_stack.shift();
                env.local_stack.pop();

                env.renames.push(renames);
                //env.local_cell_stack.shift();
                env.local_cell_stack.pop();
                env.in_function--;
                return;
            }else if (operator.data == "if"){
                var is_err = Conversion.syntax_check(expression);
                if (is_err){
                    env.error.push(is_err);
                    return new Lexer.Pair(null,null);
                }               
                Conversion.internal_conversion(expression.cdr,env);
                Conversion.internal_conversion(expression.cdr.cdr,env);
                Conversion.internal_conversion(expression.cdr.cdr.cdr,env);
                return;
            }else if (operator.data == "letrec"){
                operator.data = "let";
                var bindings = expression.cdr.car;
                var new_body = new Lexer.Pair(null,null);
                var front = new_body;
                while (bindings){
                    var init_data = bindings.car.cdr;
    
                    var new_set = new Lexer.Pair(new Lexer.Token("symbol","set!",-1),
                                        new Lexer.Pair(bindings.car.car,
                                        new Lexer.Pair(init_data.car,null)));
                    bindings.car.cdr.car = new Lexer.Token("undefined","#undef",-1);
                    bindings = bindings.cdr;
                    
                    new_body.cdr = new Lexer.Pair(new_set,null);
                    new_body = new_body.cdr;
                }
                new_body.cdr = expression.cdr.cdr;
                expression.cdr.cdr = front.cdr;

                Conversion.internal_conversion(code,env);
                return;
            }else if (operator.data == "let"){
                if (expression.cdr.car && expression.cdr.car.type == "symbol"){
                    var name = expression.cdr.car;
                    var inits = expression.cdr.cdr.car;
                    var bodies = expression.cdr.cdr.cdr;

                    var created_lambda = new Lexer.Pair(new Lexer.Token("symbol","lambda",-1),
                            new Lexer.Pair(new Lexer.Pair(inits.car.car,null),
                                bodies));


                    expression.car.data = "letrec";
                    expression.cdr.car = new Lexer.Pair(
                            new Lexer.Pair(name,
                                new Lexer.Pair(created_lambda,null)));
                    expression.cdr.cdr = new Lexer.Pair(new Lexer.Pair(name,
                                new Lexer.Pair(inits.car.cdr.car,null)));
                    Conversion.internal_conversion(code,env);

                }else{
                    Conversion.syntax_converter.let2lambda(expression);
                    Conversion.internal_conversion(code,env);
                }
                return;
            }else if (operator.data == "define"){
                var is_err = Conversion.syntax_check(expression);
                if (is_err){
                    env.error.push(is_err);
                    return new Lexer.Pair(null,null);
                }
                var var_cell = expression.cdr;
                var body_cell = expression.cdr.cdr;
                
                if (var_cell.car.type == "pair"){
                    var fomals = var_cell.car;
                    var lambda_cell = new Lexer.Pair(
                                      new Lexer.Pair(new Lexer.Token("symbol","lambda",-1),
                                                     new Lexer.Pair(fomals.cdr,
                                                                    body_cell)),null);
                    expression.cdr.car = fomals.car;
                    expression.cdr.cdr = lambda_cell;
                    Conversion.internal_conversion(code,env);
                }else{
                    Conversion.internal_conversion(body_cell,env);
                    if (env.in_function){

                        
                        var local_cell = env.local_cell_stack[env.local_cell_stack.length-1];
                        var local_cell_body = local_cell.cdr.cdr;


                        var var_data = var_cell.car.data;
                        if (env.all_symbols[var_data]){
                             var new_var_data = Conversion.gensym(var_data,env.all_symbols);
                             var local_renames = env.renames[env.renames.length-1];
                             local_renames[var_data] = new_var_data;
                             var_cell.car.data = new_var_data;
                        }

                        expression.car.data = "set!";
                        var undef_token = new Lexer.Token("undefined","#undef",-1);
                        local_cell.cdr.cdr = Conversion.create_let1(var_cell.car,undef_token,local_cell_body);

                        Conversion.internal_conversion(local_cell.cdr.cdr,env);
                    }
                }
                return;
            }else if (operator.data == "set!"){
                var is_err = Conversion.syntax_check(expression);
                if (is_err){
                    env.error.push(is_err);
                    return new Lexer.Pair(null,null);
                }
                var sym = expression.cdr.car.data;
                if (env.local_stack.length > 0){
                    var vars = env.local_stack[env.local_stack.length-1];
                    while (vars){
                        if (vars.car.data == sym){
                            var prev_lambda_expression = env.local_cell_stack[env.local_cell_stack.length-1];
                            var new_expression = 
                                Conversion.array_expand([new Lexer.Token("symbol","let",-1),
                                                        null]);
                            
                            new_expression.cdr.cdr = prev_lambda_expression.cdr.cdr;
                            prev_lambda_expression.cdr.cdr = new Lexer.Pair(new_expression,null);
                            Conversion.internal_conversion(prev_lambda_expression.cdr.cdr,env);


                            break;
                        }
                        vars = vars.cdr;
                    }
                }
            }else if (operator.data == "begin"){
                var begin_body = Conversion.expand_begin(expression.cdr);
                code.car = begin_body;
                Conversion.internal_conversion(code,env);
                return;
            }else if (operator.data == "quote"){
                if (expression.cdr.car.type == "pair"){
                
                }else if (expression.cdr.car.type == "symbol"){

                }else{
                    code.car = expression.cdr.car;
                }

                return;
            }else if (operator.data == "quasiquote"){
                code.car = Conversion.expand_quasiquote(expression);
                Conversion.internal_conversion(code,env);
                return;
            }else if (operator.data == "define-syntax"){
                var name = expression.cdr.car.data;
                var syntax_rules_exp = expression.cdr.cdr.car;
                var rule_obj = Syntax_rules.convert_rules(syntax_rules_exp);

                if (typeof rule_obj == "string"){
                    env.error.push(rule_obj);
                    return;
                }
                env.global_syntax[name] = rule_obj;
                code.car = null;
                return;
            }else if (operator.data == "import"){
                
                return;
            }else if (operator.data == "define-record-type"){
                Conversion.def_record_expander(expression);
                return;
            }

            if (env.global_syntax[operator.data]){
                
                var rule_obj = env.global_syntax[operator.data];
                var ret = Syntax_rules.match_and_convert(rule_obj,expression);
                code.car = ret;

            
            }



        }else if (operator.type == "pair"){
            Conversion.internal_conversion( code.car ,env);
        }



        
        var fun_args = expression.cdr;//cdr -> cdr.car?
        while (fun_args){
            Conversion.internal_conversion(fun_args,env);
            fun_args = fun_args.cdr;
        }

    }else{
        var atom = code.car;
        if (atom.type == "symbol"){
            code.car.data = Conversion.rename(code.car.data,env.renames);
        }
    }
}


Conversion.expand_quasiquote = function(exp){
    
    var qq_exp = exp.cdr.car;
    
    if (qq_exp.type == "pair"){
        
        var cell = qq_exp;
        var ret_cell = new Lexer.Pair(null,null);
        var front = ret_cell;
        
        var lists = [];
        var sharp_list = new Lexer.Token("symbol","#list",-1);
        while (cell){
            if (cell.car.type == "pair"){
                if (cell.car.car.type == "symbol"){
                    if (cell.car.car.data == "unquote-splicing"){
                        if (front.cdr){
                            lists.push(new Lexer.Pair(sharp_list,front.cdr));
                        }
                        lists.push(cell.car.cdr.car);
                        ret_cell = new Lexer.Pair(null,null);
                        front = ret_cell;
                        cell = cell.cdr;
                        continue;
                    }else if (cell.car.car.data == "unquote"){
                        ret_cell.cdr = new Lexer.Pair(sharp_list,new Lexer.Pair(cell.car.cdr.car,null));
                        ret_cell = ret_cell.cdr;
                        cell = cell.cdr;
                        continue;
                    }
                }
            }
            ret_cell.cdr = new Lexer.Pair(
                Conversion.expand_quasiquote(Conversion.array_expand([null,cell.car])),null);
            ret_cell = ret_cell.cdr;
            cell = cell.cdr;
        }

        if (front.cdr){
            lists.push(front.cdr);
        }
        if (lists.length == 1){
            return lists[0];
        }else{
            var new_list = [new Lexer.Token("symbol","#append!",-1)];
            for (var i=0;i<lists.length;i++){
                new_list.push(lists[i]);
            }
            return Conversion.array_expand(new_list);
        }


    }else{
        return Conversion.array_expand([new Lexer.Token("symbol","quote",-1),qq_exp]);
    }
}






Conversion.def_record_expander = function(exp){

    exp = exp.cdr;
    var name = exp.car;
    var constructor = exp.cdr.car;
    var pred = exp.cdr.cdr.car;
    var fields = exp.cdr.cdr.cdr;

    var index_converter = {};
    var field_list = [];


    var cell = constructor.cdr;
    var cnt = 0;
    while (cell){
        field_list.push(cell.car.data);
        index_converter[cell.car.data] = cnt;
        cell = cell.cdr;
        cnt++;
    }

}



Conversion.cpsconv_env_create = function(){
    return {
        "all_symbols":{}
    };
}





Conversion.Cps_converter = function(){
    this.convert = function (code,next,env){
        if (code.type == "pair"){
            if (code.car.type == "pair"){

            }else if (code.car.type == "symbol"){
                var operator = code.car.data;
                if (operator == "lambda"){
                    return this.convert_lambda(code,next,env);            
                }else if (operator == "let"){
                
                }else if ((operator == "define" || operator == "set!")){
                    //return this.define_conversion(code,next,env);
                     //var ret = this.convert_func_run(code,next,env);
                     var ret = this.def_set_conversion(code,next,env);
                     return ret;
                    /*
                    var body_cell = code.cdr.cdr;
                    body_cell.car = this.convert(body_cell.car,next,env);
                    return code;*/
                }else if (operator == "if"){
                    return this.if_conversion(code,next,env);
                }else if (operator == "quote"){
                    return code;
                }
            }       
            var func_run = this.convert_func_run(code,next,env);
            return func_run;       
            //return new Lexer.Pair(new Lexer.Token("symbol","#undef",-1),null);
        
        }else{
            return code;
        }
        
        return new Lexer.Pair(new Lexer.Token("symbol","#undef",-1),null);
    }



    this.def_set_conversion = function(code,next,env){
        var sym = code.cdr.car;
        var body = code.cdr.cdr.car;
        if (body.type != "pair" ){
            return code;
        }

       var new_sym = Conversion.gensym("p",env.all_symbols);
       var new_sym_token = new Lexer.Token("symbol",new_sym,-1);
       env.all_symbols[new_sym] = true;
       
       code.cdr.cdr.car = new_sym_token;
       

       var new_body = new Lexer.Pair(next,new Lexer.Pair(code,null));
       var lmd = this.create_cont_lambda(new_body,new_sym_token);
       var converted_body = this.convert(body,lmd,env);
       

       if (this.not_procedure(body)){
           code.cdr.cdr.car = converted_body;
           return code;
       }else{
           return converted_body;   
       }
    }



        


    this.if_conversion = function(code,next,env){
        var test_expression = code.cdr.car;
       var new_sym = Conversion.gensym("p",env.all_symbols);
       env.all_symbols[new_sym] = true;
       var new_sym_token = new Lexer.Token("symbol",new_sym,-1);

        code.cdr.car = new_sym_token;
        var lmd =this.create_cont_lambda(code,new_sym_token);
        var ret = this.convert(test_expression ,lmd,env);
        
        var converted_true_case = this.convert(code.cdr.cdr.car,next,env);
        var converted_false_case = this.convert(code.cdr.cdr.cdr.car,next,env);
        if (this.not_procedure(ret)){
            ret = code;
            code.cdr.car = test_expression;

        }

        if (this.not_procedure(converted_true_case)){
            converted_true_case = new Lexer.Pair(next,new Lexer.Pair(converted_true_case,null));
        }       
        if (this.not_procedure(converted_false_case)){
            converted_false_case = new Lexer.Pair(next,new Lexer.Pair(converted_false_case,null));
        }       

        code.cdr.cdr.car = converted_true_case;
        code.cdr.cdr.cdr.car = converted_false_case;


        return ret;
    }



    this.convert_lambda = function(code,next,env){
        // (lambda (a1 ... an) exp) -> (lambda (k a1 ... an) (k exp))


        var cont_sym_token = this.generate_symbol("k",env.all_symbols);
        cont_sym_cell = new Lexer.Pair(cont_sym_token,null);

        var new_sym = Conversion.gensym("p",env.all_symbols);
        env.all_symbols[new_sym] = true;
        var new_sym_token = new Lexer.Token("symbol",new_sym,-1);

        //(a1 ... an) -> (k a1 ... an)
        cont_sym_cell.cdr = code.cdr.car;
        code.cdr.car = cont_sym_cell;


        var body = code.cdr.cdr.car;
        /*
         bodyをconvertすると無限ループする
         */
       

        //var is_not_proc = this.not_procedure(body);
        var compiled_body = this.convert(body,cont_sym_cell.car,env);
        var is_not_proc = this.not_procedure(compiled_body);






        if (is_not_proc ){
            var apply_cont_code =  new Lexer.Pair(cont_sym_token,new Lexer.Pair(compiled_body,null));
            code.cdr.cdr = new Lexer.Pair(apply_cont_code,null );
        }else{
            code.cdr.cdr = new Lexer.Pair(compiled_body,null);
        }

        return code;
    }
    

    this.not_procedure = function(expression){
        if (expression.type != "pair"){
            return true;
        }
        if (expression.car.data == "lambda" || 
                expression.car.data == "set!" || 
                expression.car.data == "define"||
                expression.car.data == "quote"){
            return true;
        }
        return false;
    }



    this.convert_func_run = function(code,next,env){
        var args = code.cdr;

        var org = code
        var org_top = org;
        
        var body = org;

        org.cdr = new Lexer.Pair(next,null);
        org = org.cdr;

        while (args){
           if (args.car.type == "pair"){
               var line_d = Conversion.search_org_var_position(args.car);

               
               var new_sym = Conversion.gensym("p",env.all_symbols);
               env.all_symbols[new_sym] = true;

               var new_sym_token = new Lexer.Token("symbol",new_sym,line_d);
               if (line_d != -1){
                   new_sym_token.tag = "gen_var";
               }

               org.cdr = new Lexer.Pair(new_sym_token,null);
               var lmd = this.create_cont_lambda(body,new_sym_token);

               var prev_body = body;
               body = this.convert(args.car,lmd,env);

               /*
               if (this.not_procedure(body)){
                 org.cdr = new Lexer.Pair(body,null);
                 body = prev_body;
               }else{
               }*/
               if (this.not_procedure(body)){
                  org.cdr = new Lexer.Pair(body,null);
                  body = prev_body;
               }else{
                   /*
                   if (this.not_procedure(args.car)){
                       
                   }else{
                   
                   }
                   */
               }

               org = org.cdr;
           }else{
               org.cdr = new Lexer.Pair(args.car,null);
               org = org.cdr;
           }
           args = args.cdr;
        }
        


        if (org_top.car.type == "pair"){
            // ( ( x ... ) arg1 arg2 ... argn)

            var new_sym = Conversion.gensym("p",env.all_symbols,-1);
            env.all_symbols[new_sym] = true;
            var new_sym_token = new Lexer.Token("symbol",new_sym,-1);

            var lmd = this.create_cont_lambda(body,new_sym_token);
            
            var prev_body = body;

            var body = this.convert(org_top.car,lmd,env);

            if (body.car.data == "lambda"){
                org_top.car = body;
                body = prev_body;

            }else{
                org_top.car = new_sym_token;   
            }
        }
        

        return body;
    }

    this.reverse_list = function(cell,ret){
        if (cell == null){
            return ret;
        }
        var next = cell.cdr;
        var ret = new Lexer.Pair(cell.car,ret);
        return this.reverse_list(next,ret);
    }


    

    this.create_sym_cell = function(base,syms){
        var new_sym = Conversion.gensym(base,syms);
        syms[new_sym] = true;
        return new Lexer.Pair(new Lexer.Token("symbol",new_sym,-1),null);
    }

    this.generate_symbol = function(base,syms){
         var new_sym = Conversion.gensym(base,syms);
         syms[new_sym] = true;
         return new Lexer.Token("symbol",new_sym,-1);
    }

    this.create_cont_lambda = function(body,var_token){
        var lambda_cell = new Lexer.Pair(new Lexer.Token("symbol","lambda",-1,"cont"),null);

        var var_cell = new Lexer.Pair(new Lexer.Pair(var_token,null),null);

        lambda_cell.cdr = var_cell;
        var_cell.cdr = new Lexer.Pair(body,null);
        return lambda_cell;
    }


    //後で消す↓ 
    this.shallow_copy = function(ls){
        var cell = ls;
        var ret = new Lexer.Pair(null,null);
        var front = ret;
        while (ls){
        ret.cdr = new Lexer.Pair(ls.car,null);
        ret = ret.cdr;
        ls = ls.cdr;
        }
        return front.cdr;
    }



}

Conversion.search_org_var_position = function(code){
    var cell = code;
    while (cell){
        if (cell.car.type != "symbol"){
        }else if (cell.car.line != -1){
            return cell.car.line;
        }
        cell = cell.cdr;
    }
    return -1;
}





Conversion.catch_assignment_vars = function(code,ret){
    if (code.type == "pair"){
        var operator = code.car;
        if (operator.type == "pair"){
        }else{
            var ope = operator.data;

            if (ope == "lambda"){
                Conversion.catch_assignment_vars(code.cdr.cdr.car,ret);
                return;
            }else if (ope == "set!"){
                ret.push(code.cdr.car.data);
                Conversion.catch_assignment_vars(code.cdr.cdr.car,ret);
                return;
            }else if (ope == "define"){
                Conversion.catch_assignment_vars(code.cdr.cdr.car,ret);
                return;
            }
        }
        var _c = code;

        while (_c){
            Conversion.catch_assignment_vars(_c.car,ret);
            _c = _c.cdr;
        }
    }
}











/**
 *@param {vars} Array - local-variables
 */
Conversion.Closure_conv_env = function(vars){
    this.init = function(vars){
        this.vars = [];
        this.frees = {};
        this.searched = {};
        this.change_var = {};
        while (vars){
            if (vars.type != "pair"){
                this.vars.push(vars.data);
            }else{
                this.vars.push(vars.car.data);
            }
            vars = vars.cdr;
        }
    }
    this.init(vars);
}







Conversion.Closure_converter = function(all_symbols,roots,d_assignment_vars){
    this.all_symbols = all_symbols;
    this.stack = [];
    this.roots = roots;
    this.let_marker = false;
    this.d_assignment_vars = {};

    for (var i=0;i<d_assignment_vars.length;i++){
        this.d_assignment_vars[d_assignment_vars[i]] = true;
    }


    this.search_free = function(sym){
        var d_vars = this.d_assignment_vars;
        var rec = function(pos,stack){
            if (pos == -1)return 0;
            var env = stack[pos];

            if (env.change_var[sym])return -1;
            if (env.frees[sym])return 1;
            if (env.searched[sym])return 0;

            var vars = env.vars;

            for (var i=0;i<vars.length;i++){
                if (vars[i] == sym){
                    if (d_vars[sym]){
                        //env.change_var[sym] = true;
                        return -1;
                    }
                    return 1;
                }
            }

            var f = rec(pos-1,stack);
            if (f==1){
                env.frees[sym] = true;
            }else if (f==-1){
                env.change_var[sym] = true;
            }
            env.searched[sym] = true;
            return f;
        }

        rec(this.stack.length-1,this.stack);
    }


    this.convert = function(code){
        
        if (code.type == "pair"){
            var let_flag = false;
            if (code.car.type == "pair"){
                let_flag = true;
            }else if (code.car.type == "symbol"){
                var operator = code.car.data;
                if (operator == "lambda"){
                    var env = new Conversion.Closure_conv_env(code.cdr.car);
                    this.stack.push(env);
                    
                    var closure_conversion_flag = true;
                    if (this.let_marker){
                        this.let_marker = false;
                        closure_conversion_flag = false;
                    }else{
                    
                    }



                    var bodies = code.cdr.cdr;
                    while(bodies){
                        this.convert(bodies.car);
                        bodies = bodies.cdr;
                    }

                    
                    if (!closure_conversion_flag){
                        if (Object.keys(env.frees).length > 0||Object.keys(env.change_var).length > 0){
                            closure_conversion_flag = true;
                        }
                    }
                    
                    this.prev  = this.stack.pop();
                    if (closure_conversion_flag){
                        this.closure_conversion(code,this.prev);
                    }
                    return;
                }else if (operator == "set!"){
                    this.search_free(code.cdr.car.data);
                    this.search_update_change_var(code.cdr.car.data,this.stack.length-1,0);
                    /*

                    */
                    /*
                    if (this.stack.length){
                        var e = this.stack[this.stack.length-1];
                        if (e.frees[code.cdr.car.data]){
                            e.change_var[code.cdr.car.data] = true;
                        }
                    }
                    */
                }else if (operator == "quote"){
                    return;
                }
            } 

            //run-function
            {   
                var args = code.cdr;
                while(args){
                    if (args.car.type == "pair"){
                        this.convert(args.car);
                    }else{

                        this.search_free(args.car.data);


                    }
                    args = args.cdr;
                }

                if (!let_flag){
                    this.search_free(code.car.data)
                }
                
                if (let_flag){
                    this.let_marker = true;
                    this.convert(code.car);
                    
                    if (code.car.car.data == "lambda"){
                        this.lambda_lifting(code);

                        var saved_var = Conversion.gensym("%LAMBDA_",this.all_symbols);

                        var line_d = Conversion.search_org_var_position(code);
                        var saved_var_token = new Lexer.Token("symbol",saved_var,line_d);
                        if (line_d != -1){
                            saved_var_token.tag ="gen_var";   
                        }


                        this.all_symbols[saved_var] = true;
                        this.append_def(saved_var_token,code.car);
                        
                        code.car = saved_var_token;
                    }
                }else{
                    //this.search_free(code.car.data);
                }
            }
            
        }else{
        
        }
    
    }


    this.append_def = function(var_token,body){
        var d = new Lexer.Pair(new Lexer.Token("symbol","define",-1),
                new Lexer.Pair(var_token,
                new Lexer.Pair(body,null)));
        
        this.roots.push(d);
    }

    this.lambda_lifting = function(code){
        var lmd = code.car;
        var lmd_vars = lmd.cdr.car;


        var args = code.cdr;
        var frees = this.prev.frees;
        
        var var_cont = lmd_vars;
        var arg_cont = code.cdr;

        lmd_vars = lmd_vars.cdr;
        args = args.cdr;

        for (var key in frees){
            lmd_vars = new Lexer.Pair(new Lexer.Token("symbol",key,-1),lmd_vars);
            args = new Lexer.Pair(new Lexer.Token("symbol",key,-1),args);
        }
        
        var_cont.cdr = lmd_vars;
        arg_cont.cdr = args;

        lmd.cdr.car = var_cont;
        code.cdr = arg_cont;
    }
    
    this.closure_conversion = function(lambda,free_var){
        var _tmp_frees = Object.keys(free_var.frees);
        _tmp_frees.sort();

        var frees = [];
        for (var i=0;i<_tmp_frees.length;i++){
            if (free_var.frees[_tmp_frees[i]]){
                   frees.push(_tmp_frees[i]);
            }
        }

        var changes = Object.keys(free_var.change_var);
        changes.sort();

        if (frees.length>0||changes.length>0){
            var args = lambda.cdr.car;

            var env_var_token = new Lexer.Token("symbol","#local",-1);
                        

            var body = lambda.cdr.cdr;
            //while (body){
                if (body.car.type == "pair"){
                    this.closure_conversion_recur(body.car,frees,env_var_token,changes);
                }
                //body = body.cdr;
            //}
            

            var save_lambda = new Lexer.Pair(new Lexer.Token("symbol","lambda",lambda.car.line),lambda.cdr);
            var free_list = null;
            if (frees.length>0){
                free_list = this.convert_free_vars_to_list(frees);
            }

            var changes_list = null;
            if (changes.length){
                //changes_list = new Lexer.Pair(this.convert_free_vars_to_list(changes),null);
                changes_list = new Lexer.Pair(this.convert_change_vars_to_list(changes),null);
                list_write(changes_list);
            }

            lambda.car.data = "#closure";
            lambda.cdr = new Lexer.Pair(save_lambda,null);
            lambda.cdr.cdr = new Lexer.Pair(new Lexer.Pair(free_list,changes_list),null);
            
        }
    }


    this.closure_conversion_recur = function(code,frees,env_var,changes){
        var ope = code.car.data;
        if (ope == "lambda"){
            //

        }else{
            //contain set!
            var code_cell = code;
            
            while (code_cell){
                if (code_cell.car.type == "symbol"){
                  
                    var index = -1;
                    for (var i=0;i<frees.length;i++){
                        if (frees[i] == code_cell.car.data){
                            index = i;
                            break;
                        }
                    }
                    var is_change_var = false;
                    for (var j=0;j<changes.length;j++){
                        if (changes[j] == code_cell.car.data){
                            index = j;
                            is_change_var = true;
                            break;
                        }
                    }
                    if (index != -1 && is_change_var){
                            var env_var_token = new Lexer.Token("symbol","#loadout",-1);
                            var l_access = new Lexer.Pair(env_var_token,
                                            new Lexer.Pair(new Lexer.Token("integer",index,-1),null));
                            code_cell.car = l_access;     
                    }

                    if (index != -1 && !is_change_var ){
                        /*
                        var l_access = new Lexer.Pair(env_var,
                                            new Lexer.Pair(new Lexer.Token("integer",index),null));
                        */
                        var l_access = new Lexer.Pair(env_var,
                                            new Lexer.Pair(new Lexer.Token("integer",index,-1),
                                                new Lexer.Pair(code_cell.car,null)));

                        code_cell.car = l_access;
                    }


                }else if (code_cell.car.type == "pair"){
                    if (code_cell.car.car.data == "set!"){
                        this.closure_conversion_recur(code_cell.car,frees,env_var,changes);
                    }else if (ope == "if" && (code_cell.car.car.data!="lambda")){
                        this.closure_conversion_recur(code_cell.car,frees,env_var,changes);
                    }
                }   
                code_cell = code_cell.cdr;
            }
        }

        if (ope == "set!"){
            var _var = code.cdr.car;
            if (_var.type == "pair"){
                //convert:(set! (#local pos symbol) exp) -> (set! pos exp)
                code.cdr.car = _var.cdr.car;
            }
        }
    }
    

    this.search_update_change_var = function(sym,pos,uc_flag){
        if (uc_flag){
            //search
            var e = this.stack[pos];
            if (e.frees[sym]){
                if (e.change_var[sym]){
                    this.search_update_change_var(sym,pos-1,0);
                    return true;
                }else{
                    if (this.search_update_change_var(sym,pos-1,1)){
                        e.change_var[sym] = true;
                        return true;
                    }
                }
            }
            return false;
        }else{
            //update
            var e = this.stack[pos];
            if (e.frees[sym]){
                e.change_var[sym] = true;
                this.search_update_change_var(sym,pos-1,0);
            }
        }
        
    }



    //
    //free var index have bugs.
    //
    //
    this.convert_free_vars_to_list = function(frees){

        var prev_e = this.stack[this.stack.length-1];  
        var _prev_frees = Object.keys(prev_e.frees);
        _prev_frees.sort();


        var prev_frees = [];

        for (var i=0;i<_prev_frees.length;i++){
            if (prev_e.frees[_prev_frees[i]]){
                prev_frees.push(_prev_frees[i]);       
            }
        }

        var cell = new Lexer.Pair(null,null);
        var front = cell;

        for (var i=0;i<frees.length;i++){
            var sym_data = new Lexer.Token("symbol",frees[i],-1);
            
            if (prev_e.frees[frees[i]]){
                for (var index=0;prev_frees.length;index++){
                    if (prev_frees[index] == frees[i]){
                        sym_data = new Lexer.Pair(new Lexer.Token("symbol","#local",-1),
                                            new Lexer.Pair(new Lexer.Token("integer",index,-1),null));

                        break;
                    }
                }
            }
               

            var new_cell = new Lexer.Pair(sym_data,null);

            cell.cdr = new_cell;
            cell = cell.cdr;
        }
        return front.cdr;
    }

    this.convert_change_vars_to_list = function(changes){
        //1個外側の環境にアクセスする
        var prev_e = this.stack[this.stack.length-1];          
        var _prev_changes = Object.keys(prev_e.change_var);
        _prev_changes.sort();

        var cell = new Lexer.Pair(null,null);
        var front = cell;
        for (var i=0;i<changes.length;i++){
            var sym_data = undefined;
            if (prev_e.change_var[changes[i]]){
                for (var index=0;index<_prev_changes.length;index++){
                    if (_prev_changes[index] == changes[i]){
                       sym_data = new Lexer.Pair(new Lexer.Token("symbol","#loadaddr"),
                          new Lexer.Pair(new Lexer.Token("integer",index),null));
                        break;
                    }
                }
                 //sym_data = new Lexer.Pair(new Lexer.Token("symbol","#local"),
                        //new Lexer.Pair(new Lexer.Token("integer",index),null));
               
            }else{
                 sym_data = new Lexer.Pair(new Lexer.Token("symbol","#dallocate"),
                        new Lexer.Pair(new Lexer.Token("symbol",changes[i]),null));
            }
            var new_cell = new Lexer.Pair(sym_data,null);

            cell.cdr = new_cell;
            cell = cell.cdr;
        }
        return front.cdr;
    }
}





function list_write(list,nest){
    if (!nest){nest = 0;}
    if (nest >= 20){
        console.log("............ mugen loop");
        return;
    }
    if (list==null){console.log(Array(nest+1).join(" "),"()");return;}

    if (list.type == "pair"){
        var cell = list;
        console.log(Array(nest+1).join(" "),"(");
        var l = 0;
        while (cell){
            list_write(cell.car,nest+1);
            cell = cell.cdr;
            if (cell && cell.type != "pair"){
                console.log (Array(nest+2).join("  "),".");
                list_write(cell,nest+1);
                break;
            }
            l++;
        }

        console.log(Array(nest+1).join(" "),")");
    }else{
        if (list.type == "symbol"){
            console.log(Array(nest+1).join("  "),list.data);
        }else if (list.type == "bool"){
            console.log(Array(nest+1).join("  "),"bool:",list.data);
        }else if (list.type == "integer"){
            console.log(Array(nest+1).join("  "),"integer:",list.data);

        }else{
            console.log("?",list);
        }
    }
}
