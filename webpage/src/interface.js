var is_node = typeof require !==  "undefined";
if (is_node){
    var Lexer = require("./lexer");
    var Conversion = require("./conversion");
    var Compiler = require("./compiler");
    var Niyari_Vm = require("./niyari_vm");
    var Niyalisp_code = require("./niyalisp_code");
    var Syntax_converter = require("./syntax_converter");
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
        }else if (list.type == "syntax"){
            var d = "<SYNTAX::" + list.data + ">";
            console.log(Array(nest+1).join("  "),"",d);
        }else if (list.type == "symbol-env"){
            var d = "<E::" + list.data +  ">";
            console.log(Array(nest+1).join("  "),"",d);
        }else{
            console.log("?",list);
        }
    }
}






var Interface = {};


Interface.errors = {};
Interface.errors.Error = function(comment,lines){
    this.type = "error";
    this.data = comment;
    this.lines = lines;
}

Interface.errors.console_log = function(mes){
    console.log(mes);
}

Interface.error_wrapper = Interface.errors.console_log;








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


Interface.io = {};

Interface.io.nodejs_read_file = function(fname){
    var fs = require("fs");

    var ret;
    try{
        ret= fs.readFileSync(fname, 'utf-8');
    }catch(error){
        ret = null;
    }
    return ret;   
}







Interface.read_lisp_code = function(raw_code){
    //lex
    var l = Lexer.lexer(raw_code);

    if (typeof l == "string"){
        return l;
    }
    
    var org_code = [];
    for (var i=0;i<l.length;i++){
        org_code.push(l[i]);
    }
    

    //tokens to list data
    var codes = [];
    while (l.length){   
        var code = Lexer.convert_list(l);
        var err = Interface.catch_lex_error(code);
        if (err){
            var txt = "";

            for (var i=0;i<err.length;i++){
                txt += err[i].data + "\n";
            }
           return txt;
        }
        codes.push(code);
    }
    return [codes,org_code];
}



Interface.Simplicate = function(codes,syntax_env){
    var internal_codes = [];
    for (var i=0;i<codes.length;i++){
        code = codes[i];
        var ret = Syntax_converter.Syntax_convert(code.car,syntax_env);
        internal_codes.push(ret);
    }
    
    var alpha_renamed_code = [];
    for (var i=0;i<internal_codes.length;i++){
        if (internal_codes[i]){
            Syntax_converter.Alpha_renaming.alpha_renaming(internal_codes[i],syntax_env);
            alpha_renamed_code.push(internal_codes[i]);
        }
    }
    return alpha_renamed_code;
}









Interface.run_from_file = function(raw_code,output){
    
    var code_and_tokens = Interface.read_lisp_code(raw_code);

    var codes = code_and_tokens[0];
    var org_code = code_and_tokens[1];

    if (typeof codes == "string"){
        output(codes);
        return null;
    }

    var syntax_env = Syntax_converter.create_env();
    codes = Interface.Simplicate(codes,syntax_env);
    exit();

    //cps conversion
    var cps_codes = [];
    for (var i=0;i<codes.length;i++){
        if (codes[i]){
            var cps_converter = new Conversion.Cps_converter();
            var symbols = {};
            var cps_converted_code = cps_converter.convert(codes[i],new Lexer.Token("symbol","#ret",-1),symbols);
            cps_codes.push([symbols,cps_converted_code]);
            list_write(cps_converted_code);
        }
    }
    



    console.log("CPS CONVERTED END");
    
    console.log(cps_codes);
    //closure conversion
    var closure_converted_codes = [];
    for (var i=0;i<cps_codes.length;i++){
        var symbols = cps_codes[i][0];
        var cps_code = cps_codes[i][1];


        var d_assignment_vars = [];
        Conversion.catch_assignment_vars(code.car,d_assignment_vars);

        var closure_converter = new Conversion.Closure_converter(symbols,closure_converted_codes,d_assignment_vars);
        closure_converter.convert(cps_code);

        closure_converted_codes.push(cps_code);
        list_write(cps_code);
    }

    console.log("CLOSURE CONVERT END");
    //exit();


    for (var i=0;i<closure_converted_codes.length;i++){
      list_write(closure_converted_codes[i]);
    }



    //compile to vm code
    var vm_env = new Compiler.Vm_env();

    var vm_codes = [];
    var compiler = new Compiler.Compiler(vm_env);
    for (var i=0;i<closure_converted_codes.length;i++){
        var vm_code = compiler.compile(closure_converted_codes[i]);
        vm_code.push(["BREAK"]);
        vm_codes.push(vm_code);
    }
    
    //run
    var vm = new Niyari_Vm.Vm(vm_env);
    Niyari_Vm.output_function = output;
    
    vm.org_code = org_code;
    
    for (var i=0;i<vm_codes.length;i++){
        vm.run(vm_codes[i]);
    }
}



Interface.repl_listnize = function(l){
    var org_code = [];
    for (var i=0;i<l.length;i++){
        org_code.push(l[i]);
    }
    //tokens to list data
    var codes = [];
    while (l.length){   
        var code = Lexer.convert_list(l);
        var err = Interface.catch_lex_error(code);
        if (err){
            var txt = "";

            for (var i=0;i<err.length;i++){
                txt += err[i].data + "\n";
            }
           return txt;
        }
        codes.push(code);
    }
    return [codes,org_code];
}




Interface.node = {};

Interface.node.repl = function(){
    var reader = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    reader.setPrompt("niyalisp>",9);
    reader.prompt();
   

    var lcode = "";
    var syntax_env = Syntax_converter.create_env();
    var vm_env = new Compiler.Vm_env();

    var vm = new Niyari_Vm.Vm(vm_env);

    reader.on('line', function(line) {
        lcode += line;
        var tokens = Lexer.lexer(lcode);
        if (typeof tokens == "string"){
            if (tokens.match("extra")){
                console.log(tokens);
                lcode = "";
                reader.prompt();
            }
            return;
        }

        lcode = "";
        var code_and_tokens = Interface.repl_listnize(tokens);
        if (typeof code_and_tokens == "string"){
            //error output
            console.log(code_and_tokens);
            return;
        }

        var zcodes = code_and_tokens[0];
        var org_code = code_and_tokens[1];
        
        for (var x=0;x<zcodes.length;x++){
            var codes = [zcodes[x]];
            codes = Interface.Simplicate(codes,syntax_env);
            //cps
            var cps_codes = [];
            for (var i=0;i<codes.length;i++){
                if (codes[i]){
                    var cps_converter = new Conversion.Cps_converter();
                    var symbols = {};
                    var cps_converted_code = cps_converter.convert(codes[i],new Lexer.Token("symbol","#ret",-1),symbols);
                    cps_codes.push([symbols,cps_converted_code]);
                }
            }



            //closure conversion
            var closure_converted_codes = [];
            for (var i=0;i<cps_codes.length;i++){
                var symbols = cps_codes[i][0];
                var cps_code = cps_codes[i][1];


                var d_assignment_vars = [];
                Conversion.catch_assignment_vars(code.car,d_assignment_vars);

                var closure_converter = new Conversion.Closure_converter(symbols,closure_converted_codes,d_assignment_vars);
                closure_converter.convert(cps_code);

                closure_converted_codes.push(cps_code);
            }

         

            //compile to vm code

            var vm_codes = [];
            var compiler = new Compiler.Compiler(vm_env);
            for (var i=0;i<closure_converted_codes.length;i++){
                var vm_code = compiler.compile(closure_converted_codes[i]);
                vm_code.push(["BREAK"]);
                vm_codes.push(vm_code);
            }
            
            //run
            var output = function(x){console.log(x);}
            Niyari_Vm.output_function = output;
            
            vm.org_code = org_code;
            
            var last = "";
            for (var i=0;i<vm_codes.length;i++){
                last = vm.run(vm_codes[i]);
            }
            console.log(last);
        }

        reader.prompt();
        
    });
    reader.on('close', function() {
    });
}








Interface.node.run = function(){
    var argv = process.argv;
    if (argv.length == 2){
        Interface.node.repl();   
    }else{
    
    }
}

//Interface.node.run();





//
// BROWSER
//

Interface.browser = {};

Interface.browser.repl = function(terminal){
    terminal.setPrompt("niyalisp>");
    terminal.prompt();
   

    var lcode = "";
    var syntax_env = Syntax_converter.create_env();
    var vm_env = new Compiler.Vm_env();

    var vm = new Niyari_Vm.Vm(vm_env);

    terminal.setCallBack(function(line) {
        lcode += line;
        var tokens = Lexer.lexer(lcode);
        if (typeof tokens == "string"){
            if (tokens.match("extra")){
                terminal.println(tokens);
                lcode = "";
                reader.prompt();
            }
            return;
        }

        lcode = "";
        var code_and_tokens = Interface.repl_listnize(tokens);
        if (typeof code_and_tokens == "string"){
            //error output
            terminal.println(code_and_tokens);
            return;
        }

        var zcodes = code_and_tokens[0];
        var org_code = code_and_tokens[1];
        
        for (var x=0;x<zcodes.length;x++){
            var codes = [zcodes[x]];
            codes = Interface.Simplicate(codes,syntax_env);
            //cps
            var cps_codes = [];
            for (var i=0;i<codes.length;i++){
                if (codes[i]){
                    var cps_converter = new Conversion.Cps_converter();
                    var symbols = {};
                    var cps_converted_code = cps_converter.convert(codes[i],new Lexer.Token("symbol","#ret",-1),symbols);
                    cps_codes.push([symbols,cps_converted_code]);
                }
            }



            //closure conversion
            var closure_converted_codes = [];
            for (var i=0;i<cps_codes.length;i++){
                var symbols = cps_codes[i][0];
                var cps_code = cps_codes[i][1];


                var d_assignment_vars = [];
                Conversion.catch_assignment_vars(code.car,d_assignment_vars);

                var closure_converter = new Conversion.Closure_converter(symbols,closure_converted_codes,d_assignment_vars);
                closure_converter.convert(cps_code);

                closure_converted_codes.push(cps_code);
            }

         

            //compile to vm code

            var vm_codes = [];
            var compiler = new Compiler.Compiler(vm_env);
            for (var i=0;i<closure_converted_codes.length;i++){
                var vm_code = compiler.compile(closure_converted_codes[i]);
                vm_code.push(["BREAK"]);
                vm_codes.push(vm_code);
            }
            
            //run
            var output = function(x){terminal.println(x);}
            Niyari_Vm.output_function = output;
            
            vm.org_code = org_code;
            
            var last = "";
            for (var i=0;i<vm_codes.length;i++){
                last = vm.run(vm_codes[i]);
            }
            terminal.println(last);
        }

        terminal.prompt();

    });

}


//Interface.node.run();





