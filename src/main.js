var is_node = typeof require !==  "undefined";
if (is_node){
    var Lexer = require("./lexer");
    var Conversion = require("./conversion");
    var Compiler = require("./compiler");
    var Niyari_Vm = require("./niyari_vm");
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
        }else if (list.type == "undefined"){
            console.log(Array(nest+1).join("  "),"#undefined");
        }else if (list.type == "vector"){
            console.log("#");
            list_write(list.data,nest);
        }else{
            console.log("?",list);
        }
    }
}






var Interface = {};





Interface.error_wrapper = function(mes){
    console.log(mes);
}



Interface.catch_lex_error = function(code){
    if (!code){
        return false;
    }
    if (code.type == "pair"){
        var cell = code;
        var _ret = [];
        while (cell){
            if (cell.type != "pair"){
                _ret.push(Interface.catch_lex_error(cell));
                break;
            }
            _ret.push(Interface.catch_lex_error(cell.car));
            cell = cell.cdr;
        }
        
        var ret = [];
        for (var i=0;i<_ret.length;i++){
            if (_ret[i]){
                var r = _ret[i];
                for (var j=0;j<r.length;j++){
                    ret.push(r[j]);
                }
            }
        }
        if (ret.length > 0){
            return ret;
        }else{
            return false;  
        }
    }else if (code.type == "error"){
        return [code];
    }else if (code.type == "vector"){
        return Interface.catch_lex_error(code.data);
    }else{
      return false;
    }
}



Interface.run_from_file = function(raw_code,output){
    //lex
    var l = Lexer.lexer(raw_code);

    if (typeof l == "string"){
        Interface.error_wrapper(l);
        return;
    }
    
    //copy original code
    var org_code = [];
    for (var i=0;i<l.length;i++){
        org_code.push(l[i]);
    }


    //tokens to list data
    var codes = [];
    while (l.length){   
        var code = Lexer.convert_list(l);
        list_write(code);
        var err = Interface.catch_lex_error(code);
        console.log(err);
        if (err){
            var txt = "";

            for (var i=0;i<err.length;i++){
                txt += err[i].data + "\n";
            }
            Interface.error_wrapper(txt);
           return false;
        }
        codes.push(code);
    }

    //macro expand and alpha conversion and syntax conversion
    var ienv = Conversion.internal_env_create();
    for (var i=0;i<codes.length;i++){
        code = codes[i];
        Conversion.internal_conversion(code,ienv);
        if (ienv.error.length>0){
            Interface.error_wrapper(ienv.error[0]);
            return;
        }else{
            list_write(code);
        }
    }

    //cps conversion
    var cps_codes = [];
    for (var i=0;i<codes.length;i++){
        var cps_converter = new Conversion.Cps_converter();
        
        var cps_env = Conversion.cpsconv_env_create();
        cps_env.all_symbols = ienv.all_symbols;
        if (codes[i].car){
            var cps_converted_code = cps_converter.convert(codes[i].car,new Lexer.Token("symbol","#ret",-1),cps_env);
            cps_codes.push([cps_env,cps_converted_code]);
        }
    }

    //closure conversion
    var closure_converted_codes = [];
    for (var i=0;i<cps_codes.length;i++){
        var cps_env = cps_codes[i][0];
        var cps_code = cps_codes[i][1];


        var d_assignment_vars = [];
        Conversion.catch_assignment_vars(code.car,d_assignment_vars);
        var closure_converter = new Conversion.Closure_converter(cps_env.all_symbols,closure_converted_codes,d_assignment_vars);
        closure_converter.convert(cps_code);
        closure_converted_codes.push(cps_code);

        list_write(cps_code);
    }

    //compile to vm code
    var vm_codes = [];
    var compiler = new Compiler.Compiler();
    for (var i=0;i<closure_converted_codes.length;i++){
        var vm_code = compiler.compile(closure_converted_codes[i]);
        vm_code.push(["BREAK"]);
        vm_codes.push(vm_code);
    }

    //run
    var vm = new Niyari_Vm.Vm();
    Niyari_Vm.output_function = output;

    vm.org_code = org_code;
    vm.const_data = compiler.statics;
    vm.funcs = compiler.funcs;
    vm.non_eval_statics_ids = compiler.non_eval_statics_ids;

    for (var i=0;i<vm_codes.length;i++){
        vm.run(vm_codes[i]);
    }



}



Interface.nodejs_read_file = function(fname){
    var fs = require("fs");
    var ret = fs.readFileSync(fname, 'utf-8');
    return ret;   
}



/*
Interface.run_from_file(Interface.nodejs_read_file("test.scm"));
*/


//Interface.run_from_file("(cons 1 2)",console.log);
