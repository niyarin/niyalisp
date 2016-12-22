var is_node = typeof require !==  "undefined";


/**
 * @namespace
 */
Syntax_rules = {};

if (is_node){
    var Lexer = require("./lexer");
    module.exports = Syntax_rules;
}



Syntax_rules.analyze_pattern = function(pattern,literal,ellisis){
    var vars = {};
    var error = false;
    function rec(exp,dot_count){
        if (exp.type == "pair"){
            
            var cell = exp;
            
            while (cell){
                if (cell.type != "pair"){
                    break;
                }

                if (cell.car){

                    var ellipsis_flag = 0;
                    if (cell.cdr && cell.cdr.car && cell.cdr.car.type == "symbol" && cell.cdr.car.data == ellisis){
                        ellipsis_flag = 1;
                    }
                    
                    if (cell.car.type == "pair"){
                        rec(cell.car,dot_count+ellipsis_flag);
                    }else if (cell.car.type == "symbol"){
                        
                        var sym = cell.car.data;
                        if (sym == ellisis){
                            //pass
                        }else if (sym == "_"){
                            //pass
                        }else{
                            if (literal[sym]){
                                
                            }else{
                                if (vars[sym]){
                                    //error
                                    error =  "ERROR: symbol " + sym + " appears more than once" ;
                                }else{
                                    vars[sym] = dot_count + ellipsis_flag+1;
                                }
                            }
                        }
                    }
                
                }else{
                    //null
                }
                cell = cell.cdr;
            }
        }
    }
    rec(pattern,0);
    if (error){
        return error;
    }

    return vars;
}



Syntax_rules.check_template = function(template,vars,ellipsis){
    var error = false;
    function rec(template,nest){
        if (template.type == "pair"){
            var cell = template;
            while (cell){
                if (cell.type != "pair"){
                        
                }

                if (cell.car){
                    var ellipsis_flag = 0;
                    if (cell.cdr && cell.cdr.car && cell.cdr.car.data == ellipsis){
                        ellipsis_flag = 1;
                    }

                    if (cell.car.type == "pair"){
                        rec(cell.car,nest + ellipsis_flag);
                    }else if (cell.car.type == "symbol"){
                        var sym = cell.car.data;
                        if (vars[sym]){
                            if (vars[sym]-1 == nest + ellipsis_flag){
                                console.log("!!");
                            }else{
                                //error
                                error = "template's ellipsis nesting";
                            }  
                        }
                    }
                }
                cell = cell.cdr;
            }
        }
    }
    if (error){
        return error;
    }
    rec(template,0);
    return null;
}




Syntax_rules.Rule = function(patterns,templates,pattern_vars_nest,litterals,ellipsis){
    this.patterns = patterns;
    this.templates = templates;
    this.pattern_vars_nest = pattern_vars_nest;
    this.litterals = litterals;
    this.ellipsis = ellipsis;
    this.size = patterns.length;
}




Syntax_rules.convert_rules = function(rules){
   var ellipsis_symbol = "...";
    var literals_and_rules = rules.cdr;
   if (literals_and_rules.car && literals_and_rules.car.type == "symbol"){
        ellipsis_symbol = rules.car.data;
        literals_and_rules = literals_and_rules.cdr;
    }
    var literal = {};
    var cell =literals_and_rules.car; 
    while (cell){
        literal[cell.car.data] = true;
        cell = cell.cdr;
    }


    var cell = literals_and_rules.cdr;

    var patterns = [];
    var templates = [];
    var pattern_vars_nest = [];

    while (cell){
        var analized_symbols = Syntax_rules.analyze_pattern(cell.car.car,literal,ellipsis_symbol);       
        if (typeof analized_symbols == "string"){
            return analized_symbols;
        }
        var check_result = Syntax_rules.check_template(cell.car.cdr.car,analized_symbols,ellipsis_symbol);

        if (typeof check_result == "string"){
            return check_result;
        }
        patterns.push(cell.car.car);
        templates.push(cell.car.cdr.car);
        pattern_vars_nest.push(analized_symbols);
        cell = cell.cdr;
    }
    console.log("NEST??",pattern_vars_nest);
    return new Syntax_rules.Rule(patterns,templates,pattern_vars_nest,literal,ellipsis_symbol);
}



Syntax_rules.match = function(pattern,code,var_nest,ellipsis){
    console.log("pattern",pattern);
    console.log("nest",var_nest);


    var matched_vars = {};
    for (var k in var_nest){
        matched_vars[k] = [];
    }



    //rules_type
    //0: (p1 ... pn )
    //1: (p1 ... pn . pn+1)   
    //2: (p1 ... pe+1 <ellipsis> pm+1 ... pn)
    //3: (p1 ... pe+1 <ellipsis> pm+1 ... pn . px)

    function Compiled_pattern(head,center,tail,is_proper_list,tail_tail   ){
        this.head = head;
        this.tail = tail;
        this.tail_tail = tail_tail;
        this.center = center;
        this.is_proper_list = is_proper_list;
        
            
        this.rules_type = -1;

        if (center === undefined && tail.length == 0){
            if (is_proper_list){
                this.rules_type = 0;
            }else{
                this.rules_type = 1;
            }
        }else{
            if (is_proper_list){
                this.rules_type = 2;
            }else{
                this.rules_type = 3;
            }
        }
    }


    function compile(ptn){
        var cell = ptn;
        var is_proper_list = true;
        var head = [];
        var tail = [];
        var tail_tail = null;
        var center = undefined;

        var current_container = head;
        while (cell){
            if (cell.type != "pair"){
                is_proper_list = false;
                tail_tail = cell;
                break;
            }

            if (cell.cdr && cell.cdr.car && cell.cdr.car.data == ellipsis){
                center = cell.car;
                current_container = tail;
                cell = cell.cdr;
            }else{
                current_container.push(cell.car);
            
            }
            cell = cell.cdr;
        }
        console.log("font",head);
        console.log("center",center);
        console.log("tail",tail);

        return new Compiled_pattern(head,center,tail,is_proper_list,tail_tail);
    }
    
    
    function list_length(ls){
        var cell = ls;
        var ret = 0;
        while (cell){
            if (cell.type != "pair"){
                return -ret;
            }
            ret++;
            cell = cell.cdr;
        }
        return ret;
    }

    
    


    var nestack = [];
    var gen_id = 0;
    function rec(ptn,code){
        var compiled_ptn = compile(ptn);
        if (ptn.type == "pair"){
            
            var code_top = code;
            

            var matching = [];
            // 最初の要素だけマッチさせておく
            var head = compiled_ptn.head;
            var code_length = list_length(code_top);
            var abs_code_length = (code_length<0)? -code_length : code_length;
            if (head.length > abs_code_length){
                // no-match
                return false;
            }


            for (var i=0;i<head.length;i++){
                matching.push([head[i],code_top.car,0]);               
                code_top = code_top.cdr;
            }

            console.log("TYPE=",compiled_ptn.rules_type);
            console.log("LEN=",code_length);

            if (compiled_ptn.rules_type == 0){
                if (code_length < 0 || code_top){
                    //no-match
                    return false;
                }
            }else if (compiled_ptn.rules_type == 1){
                matching.push([compiled_ptn.tail_tail,code_top,0]);
            }else if (compiled_ptn.rules_type == 2){
                if (code_length < 0){
                    //no-match
                    return false;
                }   
               if (code_length - compiled_ptn.head.length  - compiled_ptn.tail.length == 0){
                    matching.push([compiled_ptn.center,null,1]);
               }else{
                   for (var i=0;i<code_length - compiled_ptn.head.length - compiled_ptn.tail.length;i++){
                       matching.push([compiled_ptn.center,code_top.car,1]);
                       code_top = code_top.cdr;
                   }   
               }
                var tail = compiled_ptn.tail;
               for (var i=0;i<tail.length;i++){
                   matching.push([tail[i],code_top.car,0]);
                   code_top = code_top.cdr;
               }
            }else if (compiled_ptn.rules_type == 3){
                var tail = compiled_ptn.tail;
                for (var i=0;i<abs_code_length - tail.length - head.length;i++){
                    matching.push([compiled_ptn.center,code_top.car,1]);
                    code_top = code_top.cdr;
                }
                for (var i=0;i<tail.length;i++){
                    matching.push([tail[i],code_top.car,0]);
                    code_top = code_top.cdr;
                }
                matching.push([compiled_ptn.tail_tail,code_top,0]);
            }

            console.log("MATCHING",matching);
            
            for (var i=0;i<matching.length;i++){
                var p = matching[i][0];
                var c = matching[i][1];
                var n = matching[i][2];
                var id = gen_id;
                gen_id++;


                if (p.type == "symbol"){
                    if (p.data == "_"){
                    
                    }else if (var_nest[p.data]){
                        if (n){
                            nestack.push(id);
                        }        
                        var copied_stack = [];
                        for (var j=0;j<nestack.length;j++){
                            copied_stack.push(nestack[j]);
                        }

                        matched_vars[p.data].push([copied_stack,c]);


                        if (n){
                            nestack.pop();
                        }

                    }
                }else if (p.type == "pair"){
                    if (n){
                        nestack.push(id);
                    }
                    if (!rec(p,c)){
                        return false;
                    }
                    if (n){
                        nestack.pop();
                    }
                }else{
                
                }
            }

        }
        return true;
    }

    if (rec(pattern,code)){
        return matched_vars;
    }else{
        return false;
    }
}





Syntax_rules.expand_template = function(template,pattern_vars,ellipsis){

    function Pos_tree(){
        this.data = {};
        this.child = {};
    }   

    
    function Pos_info(pos,id){
        this.pos = pos;
        this.id = id;
        this.prev = -1;
    }

    function push_pos_tree(id){
        var ct = pos_tree;
        for (var i=0;i<nestack.length;i++){
            ct = ct.child[nestack[i]];
        }
        ct.child[id] = new Pos_tree();
        console.log("!!",ct);
    
    }

    function search_pos(sym){
        var ct = pos_tree;
        var pos = 0;
        for (var i=0;i<nestack.length;i++){
           ct = ct.child[nestack[i]];
           if (ct.data[sym]){
               pos = ct.data[sym].pos;
           }else{
                ct.data[sym] =  new Pos_info(pos,nestack[i]);
           }
        }

        if (nestack.length == 0){
            ct.data[sym] = new Pos_info(0,null);
        }
        return ct.data[sym];
    }


    function increment_position(){
        var ct = pos_tree;
        for (var i=0;i<nestack.length;i++){
            ct = ct.child[nestack[i]];
        }
        var nl = nestack.length;
        var ret = true;
        for (var sym in ct.data){
            while (true){
                var info = ct.data[sym];
                var pos = info.pos;

                if (pattern_vars[sym].length-1 <= pos){
                    return false;
                }

                    console.log("");
                console.log("Xfrom",pattern_vars[sym][pos][0]);
                console.log("Xto",pattern_vars[sym][pos+1][0]);



                var current_shape = pattern_vars[sym][pos][0];
                var next_shape = pattern_vars[sym][pos+1][0];
                
                var differs = [];
                for (var i=0;i<nl;i++){
                    if (current_shape[i] != next_shape[i]){
                        differs.push(i);
                    }
                }

                    console.log("DIFFER",differs);
                    console.log(">>>>",nl);
                    console.log("");
                info.pos++;
                if (differs.length == 1){
                    break;
                }else if (differs.length == 0){
                    continue;
                }else{
                    return false;
                }
            }
        }
        return ret;
    }




    pos_tree = new Pos_tree();
    
    var nestack = [];
    var gen_id = 0;

    function rec(template){
        if (template.type == "pair"){
            var tcell = template;
            var rcell = new Lexer.Pair(null,null);
            var front = rcell;
            while (tcell){
                if (tcell.car){
                    var ellipsis_flag = false;
                    if (tcell.cdr && tcell.cdr.car && tcell.cdr.car.data == ellipsis){
                        ellipsis_flag = true;
                    }

                    if (tcell.car.type == "pair"){
                        if (ellipsis_flag){
                            var id = gen_id;
                            gen_id++;

                            push_pos_tree(id);
                            nestack.push(id);
                            console.log(nestack);
                            while (true){
                                rcell.cdr = new Lexer.Pair(rec(tcell.car),null);
                                rcell = rcell.cdr;

                                //position update
                                if (!increment_position()){
                                    break;
                                }

                            }
                            nestack.pop();
                        }else{
                            rcell.cdr = new Lexer.Pair(rec(tcell.car),null);
                            rcell = rcell.cdr;
                        }

                    }else if (tcell.car.type == "symbol"){
                        if (pattern_vars[tcell.car.data]){
                            var pos_info = search_pos(tcell.car.data);
                            var pos = pos_info.pos;

                            //var shape = pattern_vars[cell.car.data][pos][0];
                            var tgt = pattern_vars[tcell.car.data][pos][1];
                            if (ellipsis_flag){
                                var id = gen_id;
                                gen_id++;
                                push_pos_tree(id);
                                nestack.push(id);
                                while (true){
                                    var rr = rec(new Lexer.Pair(tcell.car,null));
                                    rcell.cdr = new Lexer.Pair(rr.car,null);
                                    rcell = rcell.cdr;
                                    if (!increment_position()){
                                        break;   
                                    }
                                }
                                nestack.pop();
                            }else{
                               rcell.cdr = new Lexer.Pair(tgt,null);
                               rcell = rcell.cdr;
                               var copied_shape = [];
                               for (var j = 0;j<nestack.length;j++){
                                    copied_shape.push(nestack[j]);
                               }
                               pos_info.prev = copied_shape;
                            }
                        }else{
                            if (tcell.car.data != ellipsis){
                                rcell.cdr = new Lexer.Pair(tcell.car,null);
                                rcell = rcell.cdr;
                            }
                        }
                    }
                
                
                }
                tcell = tcell.cdr;
            }
            return front.cdr;
        }
    }
    return rec(template);
}





Syntax_rules.match_and_convert = function(rule_obj,code){
    console.log(rule_obj);
    console.log("CON",rule_obj.size);
    var ret = null;
    for (var i=0;i<rule_obj.size;i++){
        console.log("nest?",rule_obj.pattern_vars_nest[i]);
        var is_match = Syntax_rules.match(rule_obj.patterns[i],code,rule_obj.pattern_vars_nest[i],rule_obj.ellipsis);
        if (is_match){
            console.log("MATCH!");
            console.log(is_match);
            ret = Syntax_rules.expand_template(rule_obj.templates[i],is_match,rule_obj.ellipsis);
            console.log("EXPAND",ret);
            list_write(ret);
            break;
        }
    }
    return ret;
}


function test1(){
    var syntax_rules_test = Lexer.lexer("(syntax-rules () ((_ (a b c ))(quote (a b c))))");

    var input_test = Lexer.lexer("(foo (1 2 3 ) )");
    var input_test = Lexer.convert_list(input_test);
    


    var syntax_rules_test = Lexer.convert_list(syntax_rules_test);
    


    var rule_obj = Syntax_rules.convert_rules(syntax_rules_test.car);
    var ret = Syntax_rules.match_and_convert(rule_obj,input_test.car);
    list_write(ret);
}







function test2(){
    var syntax_rules_test = Lexer.lexer("(syntax-rules () ((_ (a ... b) ... )(quote (((a ... ) b) ... ))))");

    var input_test = Lexer.lexer("(foo (1 2 3 ) (4 5 6 ) (7) )");
    var input_test = Lexer.convert_list(input_test);
    


    var syntax_rules_test = Lexer.convert_list(syntax_rules_test);
    


    var rule_obj = Syntax_rules.convert_rules(syntax_rules_test.car);
    var ret = Syntax_rules.match_and_convert(rule_obj,input_test.car);
    list_write(ret);
}












function test3(){
    var syntax_rules_test = Lexer.lexer("(syntax-rules () ((_ (a ... b) ... )(quote ((((a) ... ) b) ... ))))");

    var input_test = Lexer.lexer("(foo (1 2 3 ) (4 5 6 ) (7) )");
    var input_test = Lexer.convert_list(input_test);
    


    var syntax_rules_test = Lexer.convert_list(syntax_rules_test);
    


    var rule_obj = Syntax_rules.convert_rules(syntax_rules_test.car);
    var ret = Syntax_rules.match_and_convert(rule_obj,input_test.car);
    list_write(ret);
}










function test4(){
    var syntax_rules_test = Lexer.lexer("(syntax-rules () ((_ (a ...) ... )(quote ((((a) ... )((a) ...  )) ... )  )))");

    var input_test = Lexer.lexer("(foo (1 2 3 ) (4 5 6 ) )");
    var input_test = Lexer.convert_list(input_test);
    


    var syntax_rules_test = Lexer.convert_list(syntax_rules_test);
    


    var rule_obj = Syntax_rules.convert_rules(syntax_rules_test.car);
    var ret = Syntax_rules.match_and_convert(rule_obj,input_test.car);
    list_write(ret);
}













function test5(){
    var syntax_rules_test = Lexer.lexer("(syntax-rules () ((_ (a ...)  )(quote (((a) ...  )((a) ... ) ((a) ... ) ))))");


    var input_test = Lexer.lexer("(foo (1 2 3  4 ) )");
    var input_test = Lexer.convert_list(input_test);
    


    var syntax_rules_test = Lexer.convert_list(syntax_rules_test);
    var rule_obj = Syntax_rules.convert_rules(syntax_rules_test.car);
    var ret = Syntax_rules.match_and_convert(rule_obj,input_test.car);
    list_write(ret);
}






function test6(){
    var syntax_rules_test = Lexer.lexer("  (syntax-rules () ((_ (a ...)... b c  d)(quote (((a) ... )... ))))");
    var syntax_rules_test = Lexer.convert_list(syntax_rules_test);

    var input_test = Lexer.lexer("(foo (1 2 3 ) ( 4 5 6 ) ( 7 8 9 )  10 11 12 )");
    var input_test = Lexer.convert_list(input_test);

    var rule_obj = Syntax_rules.convert_rules(syntax_rules_test.car);
    console.log("RULE OBJ",rule_obj);
    var ret = Syntax_rules.match_and_convert(rule_obj,input_test.car);
    return;
    list_write(ret);
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

//test1();
