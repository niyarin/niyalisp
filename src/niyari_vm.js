var Niyari_Vm = {};

var is_node = typeof require !==  "undefined";

function print_blue(o){
        var red     = '\u001b[43m';
        var reset   = '\u001b[49m';
        console.log(red);
        console.log(o);
        console.log(reset);       
}

if (is_node){
    module.exports = Niyari_Vm;
    var Debug_table = require("./debug_table");

}



Niyari_Vm.Func = function(addr){
    this.type = "function";
    this.addr = addr;
}
Niyari_Vm.Native_Function = function(body,name){
    this.type = "native";
    this.body = body;
    this.name = name;
}

Niyari_Vm.Breaker = function(opt){
    this.type = "breaker";
    this.opt = opt;
}

Niyari_Vm.Closure = function(addr,free,d_allocates){
    this.type = "closure";
    this.addr = addr;
    this.free = free;
    this.d_allocates = d_allocates;
}

Niyari_Vm.Values_Pass = function(cont,body){
    this.type = "vpass";
    this.cont = cont;
    this.body = body;
    this.args = null;
}

Niyari_Vm.Contiuation = function(k){
    this.type = "continuation";
    this.k = k;
    this.saved_winder = null;
}

    
Niyari_Vm.WindUtil = function(p,winder){
    this.type = "windutil";
    this.p = p;
    this.winder = winder;
}




Niyari_Vm.Pair = function(a,b){
    this.type = "pair";
    this.car = a;
    this.cdr = b;
}
Niyari_Vm.Null = function(){
    this.type = "null";
}

Niyari_Vm.Bool = function(b){
    this.type = "bool";
    this.data = b;
}

Niyari_Vm.Integer = function(i){
    this.type = "integer";
    this.data = i;
}

Niyari_Vm.Symbol = function(sym){
    this.type = "symbol";
    this.data = sym;
}

Niyari_Vm.Str = function(s){
    this.type = "string";
    this.data = s;
}


Niyari_Vm.Vector = function(data){
    this.type = "vector";
    this.data = data;
}



Niyari_Vm.Undef = function(){
    this.type = "undefined";
}


Niyari_Vm.array2list = function(array){
    var cell = new Niyari_Vm.Pair(null,Niyari_Vm.NULL);
    var front = cell;
    for (var i=0;i<array.length;i++){
        cell.cdr = new Niyari_Vm.Pair(array[i],Niyari_Vm.NULL);
        cell = cell.cdr;
    }
    return front.cdr;
}

Niyari_Vm.list2array = function(list){
    var ret = [];
    while (list){
        if (list.type == "null"){
            break;
        }else if (list.type != "pair"){
            break;
        }
        ret.push(list.car);
        list = list.cdr;
    }
    return ret;
}



Niyari_Vm.gen_begin = function(exps,next){
    var vpass = next;
    for (var i=0;i<exps.length;i++){
        var prev_vpass = vpass;
        vpass = new Niyari_Vm.Values_Pass(Niyari_Vm.undef,exps[i]);
        vpass.args = [prev_vpass];
    }
    return vpass;
}

Niyari_Vm.output_function = console.log;



Niyari_Vm.set_core_function = function(env){

    env["display"] = new Niyari_Vm.Native_Function(Niyari_Vm.funs["display"],"display");




    env["+"] = new Niyari_Vm.Native_Function(Niyari_Vm.funs["int+"],"+(int)");
    env["-"] = new Niyari_Vm.Native_Function(Niyari_Vm.funs["int-"],"-(int)");
    env["*"] = new Niyari_Vm.Native_Function(Niyari_Vm.funs["int*"],"*(int)");
    env["="] = new Niyari_Vm.Native_Function(Niyari_Vm.funs["int="],"=(int)");
    env["modulo"] = new Niyari_Vm.Native_Function(Niyari_Vm.funs["modulo"],"modulo");

    env["not"] = new Niyari_Vm.Native_Function(Niyari_Vm.funs["not"],"not");
    env["bool?"] = new Niyari_Vm.Native_Function(Niyari_Vm.funs["bool?"],"bool?");


    env["cons"] = new Niyari_Vm.Native_Function(Niyari_Vm.funs["cons"],"cons");
    env["car"] = new Niyari_Vm.Native_Function(Niyari_Vm.funs["car"],"car");
    env["cdr"] = new Niyari_Vm.Native_Function(Niyari_Vm.funs["cdr"],"cdr");
    env["set-car!"] = new Niyari_Vm.Native_Function(Niyari_Vm.funs["set-car!"],"set-car!");
    env["set-cdr!"] = new Niyari_Vm.Native_Function(Niyari_Vm.funs["set-cdr!"],"set-cdr!");
    env["pair?"]  = new Niyari_Vm.Native_Function(Niyari_Vm.funs["pair?"],"pair?");
    env["null?"]  = new Niyari_Vm.Native_Function(Niyari_Vm.funs["null?"],"null?");
    env["list"] =  new Niyari_Vm.Native_Function(Niyari_Vm.funs["list"],"list");
    env["list?"] = new Niyari_Vm.Native_Function(Niyari_Vm.funs["list?"],"list?");


    env["length"] = new Niyari_Vm.Native_Function(Niyari_Vm.funs["length"],"length");
    env["append"] = new Niyari_Vm.Native_Function(Niyari_Vm.funs["append"],"append");
    env["reverse"] = new Niyari_Vm.Native_Function(Niyari_Vm.funs["reverse"],"reverse");


    env["vector"] = new Niyari_Vm.Native_Function(Niyari_Vm.funs["vector"],"vector");

    
    env["values"] = new Niyari_Vm.Native_Function(Niyari_Vm.funs["values"],"values");
    env["call-with-values"] = new Niyari_Vm.Native_Function(Niyari_Vm.funs["call-with-values"],"call-with-values");
    env["call/cc"] = new Niyari_Vm.Native_Function(Niyari_Vm.funs["call-with-current-continuation"],"call-with-current-continuation");
    env["dynamic-wind"] =  new Niyari_Vm.Native_Function(Niyari_Vm.funs["dynamic-wind"],"dynamic-wind");

    env["apply"] = new Niyari_Vm.Native_Function(Niyari_Vm.funs["apply"],"apply");
 

    env["error"] = new Niyari_Vm.Native_Function(Niyari_Vm.funs["error"],"error");

    env["#ret"] = new Niyari_Vm.Breaker();
}



//primitive
Niyari_Vm.bool_true = new Niyari_Vm.Bool(true);
Niyari_Vm.bool_false = new Niyari_Vm.Bool(false);
Niyari_Vm.undef = new Niyari_Vm.Undef();
Niyari_Vm.NULL = new Niyari_Vm.Null();
Niyari_Vm.zero = new Niyari_Vm.Integer(0);


Niyari_Vm.Vm = function(){
    this.code = null;
    this.funcs = null;
    this.global = {};

    this.const_data = [];
    this.un_evaled_cont_code = [];

    this.heap = [];
    this.heap_frees = [];

    //configs
    this.CONFIG_RECORD = true;
    this.CONFIG_CALL_HISTORY_SIZE = 10;

    //record
    this.call_history = [];
    this.machine_code_history = [];
    this.org_code = null;
    for (var i=0;i<this.CONFIG_CALL_HISTORY_SIZE;i++){
        this.call_history.push("dummy");
        this.machine_code_history.push("dummy");
    }
    this.set_call_history = function(d){
        this.call_history.shift();
        this.call_history.push(d);
    }
    this.set_machine_code_history = function(d){
        this.machine_code_history.shift();
        this.machine_code_history.push(d);
    }

    


    Niyari_Vm.set_core_function(this.global);

    this.func_run_code = [["FUNC_RUN"]];


    this.heap_set = function(o){
        if (this.heap_frees.length>0){
            //
        }else{
            this.heap.push(o);
            return this.heap.length-1;
        }
    }

    this.winder = [];
    

    this.init = function(){
        while (this.non_eval_statics_ids.length>0){
            var id = this.non_eval_statics_ids.pop();
            var code = this.const_data[id];
            var const_data = Niyari_Vm.const_code_expander(code);
            this.const_data[id] = const_data;
        }
    }



    this.run = function(code){
        this.init();

        console.log("!!!!!");
        console.log("!!!!!");
        
        var stack = [];
        var code = code;
        var addr = 0;

        var frees = [];
        var heap_addrs = [];
        var args = null;


        for (var iii=0;iii<500000;iii++){
            console.log(iii + ":",code[addr]);
            
            var opecode = code[addr][0];
            if (opecode == "PUSH_FUN"){
                stack.push(new Niyari_Vm.Func(code[addr][1] ));
            }else if (opecode == "LOAD_GLOBAL"){
                if (this.global[code[addr][1]]){
                    stack.push(this.global[code[addr][1]]);
                }else{
                    stack = [];
                    stack.push(new Niyari_Vm.Breaker("ERROR:UNDEFINED VARIABLE: " + code[addr][1]));
                    if (this.CONFIG_RECORD){
                        this.set_machine_code_history([code,addr] );
                    }
                    break;
                }
            }else if (opecode == "ARGS"){
                _arg = stack;
                stack = [_arg];
            }else if (opecode == "FUNC_RUN"){
                var fun = stack.pop();
                args = stack.pop(); 
                console.log(fun.type);
                if (this.CONFIG_RECORD){
                    this.set_call_history([fun,args]);
                    this.set_machine_code_history([code,addr] );
                }


                if (fun.type == "native"){
                    var ret = fun.body(args);

                    stack.push([ret]);
                    stack.push(args[0]);
                    //args = [ret];
                    code = this.func_run_code;
                    addr = -1;
                }else if (fun.type == "function"){
                    var fun = this.funcs[fun["addr"]];
                    code = fun[2];
                    addr=-1;
                    
                    if (fun[1][1]){
                        var _args = [];
                        for (var i=0;i<fun[1][0];i++){
                            _args.push(args.shift());
                        }
                        _args.push(Niyari_Vm.array2list(args));
                        args = _args;
                    }else{
                        if (args.length != fun[1][0]){
                            code = this.func_run_code;
                            stack = [[],Niyari_Vm.error_gen.argnum_error(args.length-1,fun[1][0]-1,"<proc>")];


                            
                        }
                    }
                }else if (fun.type == "breaker"){
                    if (fun.opt){
                        stack.push(fun);
                    }else{
                        stack.push(args[0]);
                    }
                    break;
                }else if (fun.type == "closure"){
                    frees = fun.free;
                    heap_addrs = fun.d_allocates;
                    var _fun = this.funcs[fun["addr"]];
                    code = _fun[2];
                    addr = -1;
                }else if (fun.type == "vpass"){
                    if (fun.args){
                        stack = [fun.args,fun.body];
                        code = this.func_run_code;
                        addr=-1;
                    }else{
                        stack = [[fun.cont,args[0]],fun.body];
                        code = this.func_run_code;
                        addr=-1;
                    }
                }else if (fun.type == "continuation"){
                    if (fun.saved_winder){
                        if (this.winder[0] == fun.saved_winder[0]){
                            stack = [[args[1]],fun.k];
                            code = this.func_run_code;
                            addr  =-1;
                        }else{
                            stack = [Niyari_Vm.bool_false];
                            
                            var tail = [];
                            {
                                //common-tail
                                var ww = this.winder;
                                var ss = fun.saved_winder;
                                if (ww.length > ss.length){
                                    ww = ww.slice(ww.length-ss.length);
                                }else if (ww.length < ss.length){
                                    ss = ss.slice(ss.length-ww.length);
                                }
                                

                                for (var i=0;i<ss.length;i++){
                                    if (ss[i] == ww[i]){
                                           for (var j=i;j<ss.length;j++){
                                                tail.push(ss[j]);
                                           }
                                           break;
                                    }
                                }
                            }
                            var left = [];

                            {
                                while (this.winder){
                                    if (this.winder.length == tail.length ){
                                        if (!this.winder||this.winder[0] == tail[0]){
                                            break;
                                        }
                                    }
                                    left.push((this.winder.shift()).cdr);
                                }
                            }
                            var befores = [];
                            {
                                var saved = fun.saved_winder;
                                this.winder = [];
                                for (var i=0;i<saved.length;i++){
                                    this.winder.push(saved[i]);
                                }
                                while (saved){
                                    if (saved.length == tail.length){
                                        if (!saved || saved[0] == tail[0]){
                                            break;
                                        }
                                    }
                                    befores.push((saved.shift()).car);
                                }

                            }
                            

                            
                            var left_before_code = [];
                            for (var i=0;i<left.length;i++){
                                left_before_code.push(left[i]);
                            }

                            for (var i=0;i<befores.length;i++){
                                 left_before_code.push(befores[i]);
                            }
                            
                            var next = new Niyari_Vm.Values_Pass(fun.k,fun.k);
                            next.args = [args[1]];
                            var bcode = Niyari_Vm.gen_begin(left_before_code,next);
                            stack = [[Niyari_Vm.undef],bcode];

                            //stack = [[args[1]],fun.k];
                            code = this.func_run_code;
                            addr = -1;
                        }
                    }else{
                        stack = [[args[1]],fun.k];
                        code = this.func_run_code;
                        addr  =-1;
                    }
                }else if (fun.type == "windutil"){
                    if (fun.p == 0){
                        this.winder.unshift(fun.winder);
                        stack = [[Niyari_Vm.bool_false] ,args[0]];
                        code = this.func_run_code;
                        addr = -1;
                    }else if (fun.p == 1){
                        this.winder.shift();
                        var vpass = fun.winder;
                        vpass.args = [args[1]];

                        stack = [[vpass],args[0]];
                        code = this.func_run_code;
                        addr = -1;
                    }else if (fun.p == 2){
                        if (this.winder.length){
                            var saved_winder = [];
                            for (var i=0;i<this.winder.length;i++){
                                saved_winder.push(this.winder[i]);
                            }
                            var cont = args[0];
                            cont.saved_winder = saved_winder;
                        }

                        stack = [[null],fun.winder];
                        code = this.func_run_code;
                        addr = -1;
                    }
                }else{
                    console.log(fun);
                    stack.push(new Niyari_Vm.Breaker(Niyari_Vm.printer(fun) + "is not applicable."));
                    break;
                }
            }else if (opecode == "LOAD_L"){
                stack.push(args[code[addr][1]]);
            }else if (opecode == "BREAK"){
                break;
            }else if (opecode == "DEFINE"){
                this.global[code[addr][1]] = stack.pop();
            }else if (opecode == "SKIP"){
                addr+=code[addr][1];
            }else if (opecode == "IF"){
                var bool = stack.pop();
                if (bool.type == "bool" && !bool.data){
                    
                }else{
                    addr++;
                }
            }else if (opecode == "PUSH_BOOL"){
                if (code[addr][1]){
                    stack.push(Niyari_Vm.bool_true);     
                }else{
                    stack.push(Niyari_Vm.bool_false);     
                }
            }else if (opecode == "PUSH_INT"){
                stack.push(new Niyari_Vm.Integer(code[addr][1]));   
            }else if (opecode == "PUSH_SYMBOL"){
                stack.push(new Niyari_Vm.Symbol(code[addr][1]));
            }else if (opecode == "PUSH_STRING"){
                stack.push(new Niyari_Vm.Str(code[addr][1]));

            }else if (opecode == "PUSH_UNDEF"){
                stack.push(Niyari_Vm.undef);
            }else if (opecode == "CREATE_FREE"){
                var free_list = [];
                for (var i=0;i<code[addr][1];i++){
                    free_list.push(stack.pop());
                }
                stack.push(free_list);
            }else if (opecode == "CREATE_CHANGE"){
                if (code[addr][1] == 0){
                    stack.push([]);
                }else{
                    var _changes = [];
                    for (var i=0;i<code[addr][1];i++){
                        _changes.push(stack.pop());
                    }
                    stack.push(_changes);
                }
            }else if (opecode == "CREATE_CLOSURE"){
                var fun = stack.pop();
                var d_allocates = stack.pop();
                var free_vars = stack.pop();
                stack.push(new Niyari_Vm.Closure(fun["addr"],free_vars,d_allocates));
                free = [];
            }else if (opecode == "LOAD_FREE"){
                stack.push(frees[code[addr][1]]);
            }else if (opecode == "GSET"){
                this.global[code[addr][1]] = stack.pop();

            }else if (opecode == "DYNAMIC_ALLOCATE"){
                var p = this.heap_set(stack.pop());
                if (p!=-1){
                    stack.push(p);
                }
            }else if (opecode == "LOAD_ADDR"){
                var p = heap_addrs[code[addr][1]];
                stack.push(p);
            }else if (opecode == "LOAD_HEAP"){
                var p = heap_addrs[code[addr][1]];
                stack.push(this.heap[p]);
            }else if (opecode == "LSET"){
                var p = heap_addrs[code[addr][1]];
                this.heap[p] = stack.pop();
            }else if (opecode == "LOAD_STATIC"){
                stack.push(this.const_data[code[addr][1]]);
            }else{
                console.log("UNDEF_OPECODE",opecode);
                stack.push(Niyari_Vm.bool_false);
                break;
            }
            
            addr++;
        }
        console.log("STACK",stack);
        var ret = stack[0];
        console.log("\n-------------------");
        console.log("-------------------");
        console.log("RET\n");
        
        var red     = '\u001b[41m';
        var reset   = '\u001b[49m';

        if (ret.type == "breaker"){
            if (ret.opt){
                Niyari_Vm.error_printer(ret.opt,this.call_history,this.machine_code_history,this);
            }else{
            }
        }else{
            console.log(red);
            console.log(Niyari_Vm.printer(stack[0]));
            console.log(reset);       
        }
        
    }
}




Niyari_Vm.const_code_expander = function(code){
    if (!code){
        return Niyari_Vm.NULL;
    }

    if (code[0] == "PAIR"){
        var a = Niyari_Vm.const_code_expander(code[1]);
        var b = Niyari_Vm.const_code_expander(code[2]);
        return new Niyari_Vm.Pair(a,b);
    }else if (code[0] == "VECTOR"){
      var data = [];
        for (var i=1;i<code.length;i++){
             data.push(Niyari_Vm.const_code_expander(code[i]));
        }
        return new Niyari_Vm.Vector(data);
    }else{
        if (code[0] == "INT"){
            return new Niyari_Vm.Integer(code[1]);
        }else if (code[0] == "SYMBOL"){
            return new Niyari_Vm.Symbol(code[1]);
        }
    }
}









Niyari_Vm.error_printer = function(error_mes,call_hist,code_hist,vm){
    console.log(error_mes);
    Debug_table.look_history(call_hist,code_hist,vm);
}


Niyari_Vm.datum_id = 0;
Niyari_Vm.printer = function(o){
    
    if (o.type == "pair"){
         var ret = "( ";
         var cell = o;
         
         var is_c_list = Niyari_Vm.is_circle_list(cell);
          if (is_c_list){
              var ctxt = Niyari_Vm.circle_list2txt(cell,is_c_list);
              return ctxt;
          }

         while (cell){
            if (cell.type == "null"){
                break;
            }else if (cell.type != "pair"){
               ret += " . " + Niyari_Vm.printer(cell);
               break;
            }
            ret += " " + Niyari_Vm.printer(cell.car);
             cell = cell.cdr;
         }
         ret += " ) ";
        return ret;
    }else if (o.type == "vector"){
        var ret = "#(";
        for (var i=0;i<o.data.length;i++){
            ret += Niyari_Vm.printer(o.data[i]) + " ";
        }
        ret += ")";
        return ret;
    }else if (o.type == "null"){
        return "\'()";
    }else if (o.type == "native"){
        return "<procedure " + o.name +" >";
   }else if (o.type == "function"){
       return "<procedure ?>";
   }else if (o.type == "closure"){
       return "<closure>";
   }else if (o.type == "breaker"){
       return "<procedure ret>";
   }else if (o.type == "continuation"){
       return "<continuation>";
    }else if (o.type == "bool"){
        if (o.data){
            return "#t";
        }else{
            return "#f";
        }
    }else if (o.type == "integer"){
        return "" + o.data;
    }else if (o.type == "symbol"){
        return o.data;
    }else if (o.type == "string"){
        return o.data;
    }else if (o.type == "undefined"){
        return "<undefined>";
    }else{
        return "?" + o.type;
    }

}




Niyari_Vm.is_circle_list = function(ls){
    var hare = ls;
    var tortoise = ls;
    while (true){
        if (hare.cdr.type != "pair" || hare.cdr.cdr.type != "pair"){
            return false;
        }
        hare = hare.cdr.cdr;
        tortoise = tortoise.cdr;

        if (hare == tortoise){
            break;
        }
    }
    return tortoise;
}


Niyari_Vm.is_dot_list = function(ls){
    var cell = ls;
    while (true){
        if (cell.type == "null"){
            return false
        }else if (cell.type!="pair"){
            return true;
        }   
        cell = cell.cdr;
    }
    return false;
}

Niyari_Vm.get_list_type = function(ls){
    var hare = ls;
    var tortoise = ls;
    var cnt = 0
    while (true){
        if (hare.cdr.type != "pair"){
            if (hare.cdr.type == "null"){
                return cnt+1;
            }
            return -1;
        }else if (hare.cdr.cdr.type != "pair"){
            if (hare.cdr.cdr.type == "null"){
                return cnt + 2;
            }
            return -1;
        }

        hare = hare.cdr.cdr;
        tortoise = tortoise.cdr;
        if (hare == tortoise){
            break;   
        }
        cnt+=2;
    }
    return -2;
}












Niyari_Vm.circle_list2txt = function(ls,tortoise){
    var hare = ls;

    var ret = "";
    if (hare != tortoise){
        ret = "( ";
        while (true){
            if (hare == tortoise){
                break;
            }
            ret += Niyari_Vm.printer(hare.car) + " ";
            hare = hare.cdr;
            tortoise = tortoise.cdr;
        }
        ret += ". ";
    }
    
    var id = Niyari_Vm.datum_id;
    Niyari_Vm.datum_id+=1;
    var cell = hare;
    ret += "#" + id + "=(";
    while (true){

        ret += Niyari_Vm.printer(cell.car) + " ";
        cell = cell.cdr;
        if (cell == hare){
            ret += ". " + "#" + id + "#)";
            break;
        }
    }
    if (id == 0){
        Niyari_Vm.datum_id = 0;
    }
    return ret;
}



//
//ERROR GENERATOR
//
//
//
Niyari_Vm.error_gen = {};

Niyari_Vm.error_gen.argnum_error = function(a,b,c){
    var error_message = "ERROR: wrong number of argument " + a + " but expected " + b + " :: " + c;
    return new Niyari_Vm.Breaker(error_message);
}

Niyari_Vm.error_gen.wrong_type_error = function(a,b){
    var error_message = "ERROR: wrong type ( " + a + " required but got " + Niyari_Vm.printer(b);
    return new Niyari_Vm.Breaker(error_message);
}






//
// FUNCTIONS
//
//

Niyari_Vm.funs = {};



//test
//
//

Niyari_Vm.funs["display"] = function(args){
    Niyari_Vm.output_function(Niyari_Vm.printer(args[1]));
    return Niyari_Vm.undef;
}





//
//r7rs 6.2.6
//
//

Niyari_Vm.operator = {};
Niyari_Vm.operator.int_add = function(a,b){
    return a.data + b.data;
}

Niyari_Vm.operator.int_sub = function(a,b){
    return a.data - b.data;
}

Niyari_Vm.operator.int_mul = function(a,b){
    return a.data * b.data;
}




Niyari_Vm.funs["int+"] = function(args){
    var ret = new Niyari_Vm.Integer(0);
    for (var i=1;i<args.length;i++){
        ret.data = Niyari_Vm.operator.int_add(ret,args[i]);
    }
    return ret;
}

Niyari_Vm.funs["int*"] = function(args){
    var ret = new Niyari_Vm.Integer(1);
    for (var i=1;i<args.length;i++){
        ret.data = Niyari_Vm.operator.int_mul(ret,args[i]);
    }
    return ret;
}



Niyari_Vm.funs["int-"] = function(args){
    if (args.length == 1){
        return new Niyari_Vm.Integer(0);
    }
    if (args.length == 2){
        return new Niyari_Vm.Integer(-args[1].data);
    }

    var ret = new Niyari_Vm.Integer(args[1].data);
    for (var i=2;i<args.length;i++){
        ret.data = Niyari_Vm.operator.int_sub(ret,args[i]);
    }
    return ret;
}


Niyari_Vm.funs["int="] = function(args){
    var v = args[1].data;
    for (var i=2;i<args.length;i++){
        if (v != args[i].data){
            return Niyari_Vm.bool_false;
        }
    }
    return Niyari_Vm.bool_true;
}



Niyari_Vm.funs["modulo"] = function(args){
    return new Niyari_Vm.Integer(args[1].data % args[2].data);
}


//
// r7rs 6.3
//
//



Niyari_Vm.funs["not"] = function(args){
    if (args[1].type == "bool" && !args[1].data){
        return Niyari_Vm.bool_true;   
    }
    return Niyari_Vm.bool_false;
}


Niyari_Vm.funs["bool?"] = function(args){
    if (args[1].type == "bool"){
        return Niyari_Vm.bool_true;
    }
    return Niyari_Vm.bool_false;
}



//
//  r7rs 6.4
//
//

Niyari_Vm.funs["pair?"]  = function(args){
    if (args[1].type == "pair"){
        return Niyari_Vm.bool_true;
    }
    return new Niyari_Vm.bool_false;
}

Niyari_Vm.funs["cons"] = function(args){
    if (args.length != 3){
        args[0] = Niyari_Vm.error_gen.argnum_error(args.length-1,2,"cons");
        return Niyari_Vm.undef;
    }
    var ret = new Niyari_Vm.Pair(args[1],args[2]);
    return ret;
}

Niyari_Vm.funs["car"] = function(args){
    if (args.length != 2){
        args[0] = Niyari_Vm.error_gen.argnum_error(args.length-1,1,"car");
        return Niyari_Vm.undef;
    }
    if (args[1].type != "pair"){
        args[0] = Niyari_Vm.error_gen.wrong_type_error(args[1],args[1]);
        return Niyari_Vm.undef;
    }

    return args[1].car;   
}
Niyari_Vm.funs["cdr"] = function(args){
    if (args.length != 2){
        args[0] = Niyari_Vm.error_gen.argnum_error(args.length-1,1,"cdr");
        return Niyari_Vm.undef;
    }
    if (args[1].type != "pair"){
        args[0] = Niyari_Vm.error_gen.wrong_type_error(args[1],"pair");
        return Niyari_Vm.undef;
    }

    return args[1].cdr;   
}


Niyari_Vm.funs["set-car!"]  = function(args){
    if (args.length != 3){
         args[0] = Niyari_Vm.error_gen.argnum_error(args.length-1,1,"set-car!");
        return Niyari_Vm.undef;
    }
    if (args[1].type != "pair"){
        args[0] = Niyari_Vm.error_gen.wrong_type_error(args[1],"pair");
        return Niyari_Vm.undef;
    }
    args[1].car = args[2];
    return Niyari_Vm.undef;
}


Niyari_Vm.funs["set-cdr!"] = function(args){
    if (args.length != 3){
         args[0] = Niyari_Vm.error_gen.argnum_error(args.length-1,1,"set-cdr!");
        return Niyari_Vm.undef;
    }
    if (args[1].type != "pair"){
        args[0] = Niyari_Vm.error_gen.wrong_type_error(args[1],"pair");
        return Niyari_Vm.undef;
    }
    
    args[1].cdr = args[2];
    return Niyari_Vm.undef;
}

//caar cadr adar cddr


Niyari_Vm.funs["null?"]  = function(args){
    if (args.length != 2){
         args[0] = Niyari_Vm.error_gen.argnum_error(args.length-1,1,"null?");
        return Niyari_Vm.undef;
   
    }

    if (args[1].type == "null"){
        return new Niyari_Vm.Bool(true);
    }
    return new Niyari_Vm.Bool(false);
}


Niyari_Vm.funs["list?"] = function(args){
    if (args.length != 2){
         args[0] = Niyari_Vm.error_gen.argnum_error(args.length-1,1,"list?");
        return Niyari_Vm.undef;
    }
    if (args[1].type != "pair" || Niyari_Vm.get_list_type(args[1])<0){
        return Niyari_Vm.bool_false;
    }
    return Niyari_Vm.bool_true;
}

Niyari_Vm.funs["make-list"] = function(args){

}

Niyari_Vm.funs["list"] = function(args){
    var ret = Niyari_Vm.array2list(args);
    return ret.cdr;
}

Niyari_Vm.funs["length"] = function(args){
    if (args.length != 2){
        args[0] = Niyari_Vm.error_gen.argnum_error(args.length-1,1,"length");
        return Niyari_Vm.undef;
    }
    if (args[1].type != "pair"){
        if (args[1].type == "null"){
            return Niyari_Vm.zero;
        }
        args[0] = Niyari_Vm.error_gen.wrong_type_error("list",args[1]);
        return Niyari_Vm.undef;
    }
    
    var lt = Niyari_Vm.get_list_type(args[1]);
    if (lt<0){
        args[0] = Niyari_Vm.error_gen.wrong_type_error("proper-list",args[1]);
        return Niyari_Vm.undef;       
    }
    return new Niyari_Vm.Integer(lt);
}


Niyari_Vm.funs["append"] = function(args){
    if (args.length == 1){
        return Niyari_Vm.NULL;
    }
    var ret_cell = new Niyari_Vm.Pair(null,Niyari_Vm.NULL);
    var front = ret_cell;
    for (var i=1;i<args.length-1;i++){
        if (args[i].type != "pair"){
            if (args[i].type != "null"){
                args[0] = Niyari_Vm.error_gen.wrong_type_error("proper-list",args[i]);
                return Niyari_Vm.undef;
            }
        }else{
            var q = Niyari_Vm.get_list_type(args[i]);
            if (q==-1){
                args[0] = Niyari_Vm.error_gen.wrong_type_error("proper-list",args[i]);
                return Niyari_Vm.undef;
            }else if (q == -2){
                var tortoise = Niyari_Vm.is_circle_list(args[i]);
                var cell = args[i];
                console.log("TORTOISE",tortoise);
                while (true){

                    if (cell == tortoise){
                        var loop_point = ret_cell;
                        while (true){
                            ret_cell.cdr = new Niyari_Vm.Pair(cell.car,null);
                            ret_cell = ret_cell.cdr;
                            cell = cell.cdr;
                            if (cell == tortoise){
                                ret_cell.cdr = loop_point.cdr;
                                return front.cdr;
                            }
                        }
                    }

                    ret_cell.cdr = new Niyari_Vm.Pair(cell.car,Niyari_Vm.NULL);
                    ret_cell = ret_cell.cdr;

                    cell = cell.cdr;
                    tortoise = tortoise.cdr;
                }
            }
            var cell = args[i];
            while (true){
                if (cell.type == "null"){
                    break;
                }
                ret_cell.cdr = new Niyari_Vm.Pair(cell.car,Niyari_Vm.NULL);
                ret_cell = ret_cell.cdr;
                cell = cell.cdr;
            }
        }
    }
    ret_cell.cdr = args[args.length-1];
    return front.cdr;
}

Niyari_Vm.funs["reverse"] = function(args){
    if (args.length != 2){
        args[0] = Niyari_Vm.error_gen.argnum_error(args.length-1,1,"reverse");
        return Niyari_Vm.undef;
    }
    if (args[1].type != "pair"){
        args[0] = Niyari_Vm.error_gen.wrong_type_error("proper-list",args[1]);
        return Niyari_Vm.undef;
    }
    
    var q = Niyari_Vm.get_list_type(args[1]);
    if (q == -1){
        args[0] = Niyari_Vm.error_gen.wrong_type_error("proper-list",args[1]);
        return Niyari_Vm.undef;
    }else if (q == -2){
        var tortoise = Niyari_Vm.is_circle_list(args[1]);
        var cell = args[1];
        while (true){
            if (cell == tortoise){
                break;
            }
            cell = cell.cdr;
            tortoise = tortoise.cdr;
        }
        var ret = Niyari_Vm.NULL;
        var loop_cell = null;
        while (true){
            ret = new Niyari_Vm.Pair(cell.car,ret);
            cell = cell.cdr;
            if (!loop_cell){
                loop_cell = ret;
            }
            if (cell == tortoise){
                break;
            }
        }
        loop_cell.cdr = ret;
        return ret;
    }
    
    var cell = args[1];
    var ret = Niyari_Vm.NULL;
    while (true){
        ret = new Niyari_Vm.Pair(cell.car,ret);
        cell = cell.cdr;
        if (cell.type == "null"){
            break;
        }
    }
    return ret;
}

Niyari_Vm.funs["list-tail"] = function(args){

}

Niyari_Vm.funs["list-ref"] = function(args){

}

Niyari_Vm.funs["list-set!"] = function(args){

}

//
//memq memv member
//assq assv assoc
//
Niyari_Vm.funs["list-copy"] = function(args){

}


//r7rs 6.8

Niyari_Vm.funs["vector"] = function(args){
    return new Niyari_Vm.Vector(args.slice(1));
}

    


//r7rs 6.10

Niyari_Vm.funs["values"] = function(args){
    if (args[0].type == "vpass"){
        var vpass = args[0];
        vpass.args = [vpass.cont];
        for (var i=1;i<args.length;i++){
            vpass.args.push(args[i]);
        }
    }else{
        return args[1];
    }
    return new Niyari_Vm.Bool(false);
}

Niyari_Vm.funs["call-with-values"] = function(args){
    var a = args[0];
    var b = args[1];
    var c = args[2];
    args[0] = b;
    
    var ret = new Niyari_Vm.Values_Pass(a,c);
    
    //return new Niyari_Vm.Bool(false);
    return ret;
}

Niyari_Vm.funs["apply"] = function(args){
    
    var vpass = new Niyari_Vm.Values_Pass(args[0],args[1]);
    var array = Niyari_Vm.list2array(args[2]);
    array.unshift(args[0]);
    vpass.args = array;
    args[0] = vpass;
    return new Niyari_Vm.Bool(false);
}


Niyari_Vm.funs["call-with-current-continuation"] = function(args){
    var vpass = new Niyari_Vm.Values_Pass(args[0],args[1]);
    var cont = new Niyari_Vm.Contiuation(args[0]);
    vpass.args = [args[0],cont];
    args[0] = new Niyari_Vm.WindUtil(2,vpass);
    return cont;
}

Niyari_Vm.funs["dynamic-wind"] = function(args){
    console.log("DYNAMIC WIND");
    var b = args[1];
    var t = args[2];
    var a = args[3];
    var cont = args[0];
    args[0] = b;
    var winder = new Niyari_Vm.Pair(b,a);

    var ret_body_result = new Niyari_Vm.Values_Pass(cont,cont);

    var pop_winder = new Niyari_Vm.Values_Pass(a,new Niyari_Vm.WindUtil(1,ret_body_result));
    
    var body_runner = new Niyari_Vm.Values_Pass(cont,t);//after_runner);
    body_runner.args = [pop_winder];
    
    var push_winder = new Niyari_Vm.Values_Pass(body_runner,new Niyari_Vm.WindUtil(0,winder));

    var ret = new Niyari_Vm.Values_Pass(cont,push_winder);
    ret.args = [cont];
    return ret;
}

//r7rs 6.11


Niyari_Vm.funs["error"] = function(args){
    var error_mes = "ERROR:  "  + args[1].data + " " + Niyari_Vm.printer(args[2]);
    var error = new Niyari_Vm.Breaker(error_mes);
    args[0] = error;
    return Niyari_Vm.undef;
}



