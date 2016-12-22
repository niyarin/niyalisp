var is_node = typeof require !==  "undefined";


/**
 * @namespace
 */
Compiler = {};

if (is_node){
    var Lexer = require("./lexer");
    module.exports = Compiler;
}


/**
 *@constructor
 *@classdesc  scm to my vmcode compiler 
 */
Compiler.Compiler = function(){
    
    this.stack = [];
    this.funcs = [];

    this.statics = [];
    this.non_eval_statics_ids = [];

    //opetions
    this.CONFIG_INSERT_DEBUG_CODE = true;
    
    this.funcs_push = function(f){
        this.funcs.push(f);
        return this.funcs.length-1;
    }

    this.statics_push = function(s){
        this.statics.push(s);
        return this.statics.length-1;
    }


    this.compile = function(code){
        if (code.type == "pair"){
            var operator = code.car.data;
            
            if (operator == "define"){
                var ret = [];
                var body = code.cdr.cdr.car;
                var compiled_body = this.compile(body);
                ret = ret.concat(compiled_body);
                ret.push(["DEFINE",code.cdr.car.data]);
                ret.push(["PUSH_UNDEF"]);
                return ret;
            }else if (operator == "lambda"){
                return this.compile_lambda(code);
            }else if (operator == "#closure"){
                return this.compile_closure(code);
            }else if (operator == "#local"){
                if (this.CONFIG_INSERT_DEBUG_CODE && code.cdr.cdr){
                    var sym_data = code.cdr.cdr.car;
                    if (sym_data.tag == "gen_var"){
                        return [["LOAD_FREE",code.cdr.car.data,"l " + sym_data.line]];
                    }else if (sym_data.line != -1){
                        return [["LOAD_FREE",code.cdr.car.data,sym_data.line]];
                    }
                    
                }
                return [["LOAD_FREE",code.cdr.car.data]];
            }else if (operator == "#loadout"){
                return [["LOAD_HEAP",code.cdr.car.data]];
            }else if (operator == "#dallocate"){
                var ret = [];
                ret = ret.concat(this.compile(code.cdr.car));
                ret.push(["DYNAMIC_ALLOCATE"]);
                return ret;
            }else if (operator == "#loadaddr"){
                return [["LOAD_ADDR",code.cdr.car.data]];
            }else if (operator == "if"){
                var ret = [];

                var test = this.compile(code.cdr.car);
                ret = ret.concat(test);

                ret.push(["IF"]);

                var tcase = this.compile(code.cdr.cdr.car);
                var fcase = this.compile(code.cdr.cdr.cdr.car);

                var skip_t_length = tcase.length;
                var skip_f_length = fcase.length;
                ret.push(["SKIP",skip_t_length+1]);
                ret = ret.concat(tcase);
                ret.push(["SKIP",skip_f_length]);
                ret = ret.concat(fcase);
                return ret;
            }else if (operator == "set!"){
                var local = [];
                local = local.concat(this.compile(code.cdr.cdr.car));
                if (code.cdr.car.type == "symbol"){
                    local.push(["GSET",code.cdr.car.data]);  
                }else{
                    local.push(["LSET",code.cdr.car.data]);
                }
                local.push(["PUSH_UNDEF"]);
                return local;
            }else if (operator == "quote"){
                if (code.cdr.car.type == "symbol"){
                    return [["PUSH_SYMBOL",code.cdr.car.data]];
                }else{
                    var const_code = Compiler.compile_const_list(code.cdr.car);
                    var static_addr = this.statics_push(const_code);   
                    this.non_eval_statics_ids.push(static_addr);
                    
                    return [["LOAD_STATIC",static_addr]];
                }
            }
            //FUNC RUN
            {
                var ret = [];
                var args = code.cdr;
                while (args){
                    var cp = this.compile(args.car);
                    //ret.push(cp);
                    ret = ret.concat(cp);
                    args = args.cdr;
                }
                ret.push(["ARGS"]);
                var compiled_fun = this.compile(code.car);
                //ret.push(compiled_fun);
                ret = ret.concat(compiled_fun);
                ret.push(["FUNC_RUN"]);
                return ret;
            }

        }else if (code.type == "undefined"){
            return [["PUSH_UNDEF"]];
        }else if (code.type == "symbol"){
            
            if (this.stack.length > 0){
                var local = this.stack[this.stack.length-1];
                for (var i=0;i<local[0].length;i++){
                    if (local[0][i] == code.data){
                        if (this.CONFIG_INSERT_DEBUG_CODE){
                            if (code.line != -1){
                                return [["LOAD_L",i,code.line]];
                            }
                        }
                        return [["LOAD_L",i]];
                    }
                }
                if (local[1] == code.data){
                    if (this.CONFIG_INSERT_DEBUG_CODE){
                        if (code.line != -1){
                            return [["LOAD_L",local[0].length,code.line]];
                        }
                    }
                    return [["LOAD_L",local[0].length]];
                }
            }

            if (this.CONFIG_INSERT_DEBUG_CODE){
                if (code.line!=-1){
                    if (code.tag == "gen_var"){
                        return [["LOAD_GLOBAL",code.data,"l "+code.line]];
                    }
                    return [["LOAD_GLOBAL",code.data,code.line]];
                }

            }
            return [["LOAD_GLOBAL",code.data]];
        }else if (code.type == "bool"){
            if (code.data == "#f"){
                return [["PUSH_BOOL",0]];
            }else{
                return [["PUSH_BOOL",1]];
            }
        }else if (code.type == "integer"){
            return [["PUSH_INT",code.data]];
        }else if (code.type == "string"){
            return [["PUSH_STRING",code.data]];
        }else if (code.type == "vector"){
          var const_code = Compiler.compile_const_vector(code.data);
          var static_addr = this.statics_push(const_code);   
          this.non_eval_statics_ids.push(static_addr);
          return [["LOAD_STATIC",static_addr]];         


        }
    }

    this.compile_lambda = function(code){
        var ret = [];
        ret.push("FUN");
        var arg = code.cdr.car;
        
        var f_tag = "FUN";
        if (code.car != -1){
            f_tag = code.car.line;
        }

        var argument = [];
        var variable_argument = null;
        while (arg){
            if (arg.type != "pair"){
                variable_argument = arg.data;
                break;
            }
            argument.push(arg.car.data);
            arg = arg.cdr;
        }
        this.stack.push([argument,variable_argument]);


        var body = code.cdr.cdr;

        var compiled_body = this.compile(body.car);
        compiled_body.push(["BREAK"]);
        this.stack.pop();
        
        var tail_var = 0;
        if (variable_argument){tail_var = 1;}
       // list_write(code);
        var fun = [f_tag,[argument.length,tail_var],compiled_body];
        var id = this.funcs_push(fun);
        
        return [["PUSH_FUN",id]];
    }

    this.compile_closure = function(code){
       var lmd = code.cdr.car;
       var env = code.cdr.cdr.car;
       var free_vars = env.car;
       var change_vars = undefined;
       if (env.cdr){
           change_vars = env.cdr.car;
       }

        var local = [];
        var local_cnt = 0;

        var _frees = [];
        while (free_vars){
            if (free_vars.car){
                _frees.push(this.compile(free_vars.car));
                local_cnt++;
            }
            free_vars = free_vars.cdr;
        }
       
       for (var i=_frees.length-1;i>-1;i--){
           local = local.concat(_frees[i]);
       }

       local.push(["CREATE_FREE",local_cnt]);
        
       var changes_cnt = 0;
        while (change_vars){
            if (change_vars.car){
                local = local.concat(this.compile(change_vars.car));
                changes_cnt++;
            }
            change_vars = change_vars.cdr;
        }
        
        local.push(["CREATE_CHANGE",changes_cnt]);
        local = local.concat(this.compile_lambda(lmd));
        local.push(["CREATE_CLOSURE"]);
        return local;
    }

}

Compiler.compile_const_list = function(code){
    var cell = code;
    var ret = [null,null,null];
    var front = ret;

    while (cell){
        if (cell.cdr && cell.cdr.type != "pair" ){
            break;
        }

        if (cell.car.type == "pair"){
        } else{
            var o = cell.car;
            if (o.type == "symbol"){
                o = ["SYMBOL",o.data];
            }else if (o.type == "char"){

            }else if (o.type == "integer"){
                o = ["INT",o.data];
            }else if (o.type == "bool"){
                o = ["BOOL",o.data];
            }else if (o.type == "vector"){
                o = Compiler.compile_const_vector(o.data);
            }else{
                o = ["?",o.data];
            }
            


            ret[2] = ["PAIR",o,null]
            ret = ret[2];
        }  
        cell = cell.cdr;
    }
    return front[2];
}   

Compiler.compile_const_vector = function(code){
  var cell = code;
  var ret = ["VECTOR"];
  while (cell){
      var o = cell.car;
      if (o.type == "symbol"){
        o = ["SYMBOL",o.data];
      }else if (o.type == "char"){

      }else if (o.type == "integer"){
        o = ["INT",o.data];
      }else if (o.type == "bool"){
        o = ["BOOL",o.data];
      }else{
        o = ["?",o.data];
      }   
      ret.push(o);
      cell = cell.cdr;
  }
  return ret;
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
            console.log(Array(nest+1).join("  "),"integer:",list.data);
        }else{
            console.log("?",list);
        }
    }
}



