var is_node = typeof require !==  "undefined";


/**
 * @namespace
 */
Syntax_rules = {};

if (is_node){
    var Lexer = require("./lexer");
    module.exports = Syntax_rules;
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

function print_red(o){
        var red     = '\u001b[43m';
        var reset   = '\u001b[49m';
        console.log(red);
        console.log(o);
        console.log(reset);       
}





Syntax_rules.nomatch = new Lexer.Token("nomatch","nomatch",-1);
Syntax_rules.nullp = new Lexer.Token("nullp","nullp",-1);

Syntax_rules.Symbol_env = function(sym,env,line,tag){
    this.type = "symbol-env";
    this.data = sym.data;
    this.sym = sym;
    this.env = env;
    this.tag = tag;
    this.line = line;
}


Syntax_rules.analyze_pattern = function(pattern,literal,ellisis){
    var vars = {};
    var error = false;
    function rec(exp,dot_count){
        if (exp.type == "pair"){
            
            var cell = exp;
            
            while (cell){
                if (cell.type != "pair"){
                    if (cell.type == "symbol"){
                        var sym = cell.data;
                        if (sym == "_"){
                        }else if (literal[sym]){
                        
                        }else{
                            vars[sym] = dot_count + 1;
                        }
                    }

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
                                    break;
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

    
    function get_pattern_symbols(ptn,ellipsis_symbol){
        console.log("GET PATTERN SYMBOLS",ptn);
        //code が'() でpatternが pairのケースの時、patternからsymbolを取り出す。
        
        if (ptn.cdr && ptn.cdr.type == "pair" && ptn.cdr.car.type == "symbol" && ptn.cdr.car.data == ellipsis_symbol){//changed

            if (ptn.car.type == "pair"){
              console.log("PAIR-CASE");
                var cell = ptn.car;
                var stack = [];
                var symbols = [];
                while (stack.length || cell){
                    if (!cell){
                        var cell = stack.shift();
                    }else{
                        if (cell.car.type == "symbol" && cell.car.data != ellipsis_symbol){
                            symbols.push(cell.car.data);
                        }else if (cell.car.type == "pair"){
                            stack.push(cell.cdr);
                            cell = cell.car;
                            continue;
                        }
                        cell = cell.cdr;
                    }
                }
                return symbols;           
            }else if (ptn.car.type == "symbol"){
              return [ptn.car.data];
            }
        }else{
            return false;
        }
        

    }
    
    


    var nestack = [];
    var gen_id = 0;
    function rec(ptn,code){
        var compiled_ptn = compile(ptn);
        console.log("COMPILED_PTN=",compiled_ptn);
        if (ptn.type == "pair"){
            
            var code_top = code;
            

            var matching = [];
            // compiled_ptn 
            // (_ a1 a2 ... an b <ellipsis> c1 c2 ... cn )
            // head:a1 a2 ... an
            // center:b <ellipsis>
            // tail: c1 c2 ... cn
            
            var head = compiled_ptn.head;
            var code_length = list_length(code_top);
            var abs_code_length = (code_length<0)? -code_length : code_length;
            console.log(head.length,abs_code_length);
            list_write(code);
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
                console.log("RULE_TYPE=2");
                console.log(compiled_ptn.center);
                if (code_length < 0){
                    //no-match
                    return false;
                }   
               if (code_length - compiled_ptn.head.length  - compiled_ptn.tail.length == 0){
                   console.log("NO-MATCH");
                   // マッチしない場合なにも加えない?
                   // 途中のカッコを記録したい
                   //matching.push([compiled_ptn.center,Syntax_rules.nomatch,1]);
                   //matching.push([compiled_ptn.center,null,1]);

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
                var p = matching[i][0];//pattern
                var c = matching[i][1];//code
                var n = matching[i][2];//contain <ellipsis>
                var id = gen_id;
                gen_id++;
                
                console.log("MATCHING",p,c,n);
                if (!p){
                    if (c){
                        return false;   
                    }
                }else if (p.type == "symbol"){
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
                    if (c == null){
                        console.log("!!");
                        console.log("!!");
                        console.log("!!");
                        console.log("!!");
                        console.log("ZERO PATTERN!!!!!!!!!!!!",p,n);
                        console.log("NESTACK",n,nestack);
                        console.log("!!");
                        console.log("!!");
                        console.log("!!");
                        console.log("!!");

                        var pattern_symbols = get_pattern_symbols(p,ellipsis);
                        console.log("OK",pattern_symbols);

                        if (!pattern_symbols){
                            return false;
                        }else{
                            if (n){
                                nestack.push(id);
                            }
                            for (var k=0;k<pattern_symbols.length;k++){
                                var copied_stack = [];
                                for (var j=0;j<nestack.length;j++){
                                    copied_stack.push(nestack[j]);
                                }
                                matched_vars[pattern_symbols[k]].push([copied_stack,null]);//あとでここに細工するかも
                                //matched_vars[pattern_symbols[k]].push([copied_stack,Syntax_rules.nullp]);
                            }
                            if (n){
                                nestack.pop();
                            }
                        }

                    }else{

                        if (c.type != "pair"){
                            return false;
                        }

                        if (n){
                            nestack.push(id);
                        }

                        if (!rec(p,c)){
                            return false;
                        }
                        if (n){
                            nestack.pop();
                        }

                    }
                }else if (p.type != "pair"){
                    console.log("NOT PAIR");
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


/**
 *syntax-rulesにまっちしたものを展開する
 *@param {Lexer.Token | Lexer.Pair} template - 展開パターン 
 *@param {Object} pattern_vars - パターン変数と[木の形,実際のコード]の辞書
 *@param {string} ellipsis - 省略記号
 *@param {Object} r_env - syntaxの定義した場所の環境
 *@param {Integer} unique - ユニークなid
 */
Syntax_rules.expand_template = function(template,pattern_vars,ellipsis,r_env,unique){
        
    function Pos_tree(){
        this.data = {};
        this.child = {};//HashMap(symbol<string>,pos_info<Pos_info>)
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

    function compare_tree_shape_size(sym){
      console.log(pos_tree.data);
      var pos_info = search_pos(sym);
      var pos = pos_info.pos;

      var code_tree_shape = pattern_vars[sym][pos][0];
      var pattern_tree_shape = nestack;
       
      console.log("CODE",code_tree_shape);
      console.log("PATTERN",pattern_tree_shape);

      if (code_tree_shape.length < pattern_tree_shape.length){
         return 1;
      }else if (code_tree_shape.length == pattern_tree_shape.length){
        return 2;
      }
      return 0;
    }

    
    function increment_position(){
        var ct = pos_tree;
        //treeのrootから一番深いnodeまでたどる
        for (var i=0;i<nestack.length;i++){
            ct = ct.child[nestack[i]];
        }
        
        //一番深いnodeに関連付けられるパターン変数から実コードへのポインたをインクリメントする。
        //これ以上インクリメントできなければ、returnして、戻り先でnestackをpopする。
        //
        var nl = nestack.length;
        var ret = true;
        for (var sym in ct.data){
            while (true){
                var info = ct.data[sym];
                var pos = info.pos;
                
                console.log("PATTERN_VARS=",pattern_vars[sym]);
                
                if (pattern_vars[sym].length-1 <= pos){
                    return false;
                }

                console.log("CURRENT_SHAPE",pattern_vars[sym][pos][0]);
                console.log("NEXT_SHAPE",pattern_vars[sym][pos+1][0]);

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
                    console.log("DIFFERS_LENGTH > 1");
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
        console.log("MATCH");
        list_write(template);

        if (template.type == "pair"){
            var tcell = template;
            var rcell = new Lexer.Pair(null,null);
            var front = rcell;
            while (tcell){

                if (tcell.type != "pair"){
                    if (tcell.type == "symbol"){
                        if (pattern_vars[tcell.data]){
                            var pos_info = search_pos(tcell.data);
                            var pos = pos_info.pos;
                            var tgt = pattern_vars[tcell.data][pos][1];

                            rcell.cdr = tgt;

                            var copied_shape = [];
                            for (var j = 0;j<nestack.length;j++){
                                copied_shape.push(nestack[j]);
                            }
                           pos_info.prev = copied_shape;

                        }else{
                            var r_symbol = new Syntax_rules.Symbol_env(tcell,r_env,-1,unique);
                            rcell.cdr = r_symbol;
                        }
                    }else{
                        rcell.cdr = tcell;
                    }

                }else if (tcell.car){
                    var ellipsis_flag = false;
                    if (tcell.cdr && tcell.cdr.car && tcell.cdr.car.data == ellipsis){
                        ellipsis_flag = true;
                    }
                

                    if (tcell.car.type == "pair"){
                      console.log("CASE:() ... ");
                        if (ellipsis_flag){
                            var id = gen_id;
                            gen_id++;

                            push_pos_tree(id);
                            nestack.push(id);
                            console.log("nestack=",nestack);
                            while (true){
                                //1回目でincrement_positionが失敗するケースは?

                                var rr = rec(tcell.car);
                                console.log(rr);
                                if (rr.type == "zeromatch"){
                                    console.log("ZERO-MATCH");
                                    console.log(tcell.car);
                                    console.log(rr.data);
                                    
                                    var rr_sym = rr.data[0];
                                    var rr_pos = rr.data[1];
                                    
                                        
                                    var current_ptn_shape = pattern_vars[rr_sym][rr_pos][0];
                                    console.log(current_ptn_shape);
                                    console.log(nestack);
                                    if (nestack.length == current_ptn_shape.length){
                                        console.log("OKKKK");
                                        rr = null;
                                    }else{
                                        nestack.pop();
                                        return rr;
                                    }
                                        
                                }else if (rr.type == "nomatch"){
                                    if (nestack.length == 1){
                                        break;
                                    }else{
                                        nestack.pop();
                                        return rr;
                                    }
                                }
                                console.log("^^ ()... =>",rr);
                                rcell.cdr = new Lexer.Pair(rr,null);
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
                            
                            console.log("HOEEEE",pattern_vars[tcell.car.data]);
                            if (pattern_vars[tcell.car.data].length == 0){
                                if (nestack.length >= 2){
                                    return Syntax_rules.nomatch;
                                }else{
                                    break;
                                }
                            }
                            var compared_shape = compare_tree_shape_size(tcell.car.data);
                            console.log("CS",compared_shape);
                            print_red(tcell.car.data);

                            if (compared_shape == 1){
                                //pos_info.pos+=1;
                                return new Lexer.Token("zeromatch",[tcell.car.data,pos],-1);
                            }
                            //compared_shapeが2のやつ要検証
                            


                            //var shape = pattern_vars[cell.car.data][pos][0];
                            //
                            //
                            console.log("POS=",tcell.car.data,pos);
                            console.log("TEMPLATE=",template);
                            console.log("PATTERN_VARS[TCELL.CAR]",pattern_vars[tcell.car.data]);

                            //(pattern_vars[sym].length-1 <= pos)

                            
                            var tgt = pattern_vars[tcell.car.data][pos][1];

                            if (ellipsis_flag){
                                if (compared_shape == 2){
                                
                                }else{
                                    var id = gen_id;
                                    gen_id++;
                                    push_pos_tree(id);
                                    nestack.push(id);
                                    while (true){
                                        //下のellipsis_flag=falseのcopied_shapeを利用する。
                                        var rr = rec(new Lexer.Pair(tcell.car,null));
                                        console.log("RR=",rr);
                                        rcell.cdr = new Lexer.Pair(rr.car,null);


                                        rcell = rcell.cdr;
                                        if (!increment_position()){
                                            break;   
                                        }
                                    }
                                    nestack.pop();
                                }
                            }else{
                               //pattern_varsかつ後ろにellipsisがないケース
                               //ここで確実にマッチする保証はあるのか(ない? -> その外側の括弧にellipsisがある場合とか? -> その外側でincrement_positionしていることとはどうなる?) ->
                               //(increment_positionは、templateにおける深さでmatch辞書とは関係ないよ)
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
                                var r_symbol = new Syntax_rules.Symbol_env(tcell.car,r_env,-1,unique);
                                //rcell.cdr = new Lexer.Pair(tcell.car,null);
                                rcell.cdr = new Lexer.Pair(r_symbol,null);
                                rcell = rcell.cdr;
                            }


                        }
                    }else{
                        rcell.cdr = new Lexer.Pair(tcell.car,null);
                        rcell = rcell.cdr;
                    }
                }else{
                    rcell.cdr = new Lexer.Pair(null,null);
                    rcell = rcell.cdr;
                }
                tcell = tcell.cdr;
            }
            return front.cdr;
        }else if (template.type == "symbol"){
            if (pattern_vars[template.data]){
                return pattern_vars[template.data][0][1];
            }
            return template;
        }else{
            return template;
        }
    }
    return rec(template);
}



Syntax_rules.hygenic_convert = function(code){
    var syms = {};
    function get_sym(code){
        var cell = code;
        while (cell){
            if (cell.type != "pair"){
                if (cell.type == "symbol"){
                    syms[cell.data] = true;
                }else if (cell.type == "symbol-env"){
                    syms[cell.data] = true;
                }
                break;
            }
            get_sym(cell.car);
            cell = cell.cdr;
        }
    }
    get_sym(code);

    

    function gensym(sym){
        if (!syms[sym]){
            return null;       
        }
        var new_sym = sym;
        for (var i=0;i<10000;i++){
            new_sym = sym + "$" + i;
            if (!syms[new_sym]){
                return new_sym;
            }
        }
        errorrrrrrr();
    }



    function rename(code,renames){
        list_write(code);
        console.log("RENME");
        if (code.type == "pair"){
            if (code.car.type == "syntax"){
                //syntax

                var ope = code.car.data;

                if (ope == "lambda"){
                    var forms = code.cdr.car;    
                    var cell = forms;
                    var f_arrays = [];
                    while (cell){

                        if (cell.type != "pair"){
                            if (cell.type == "symbol-env"){
                                f_arrays.push(cell.data);
                                renames[cell.data] = gensym(cell.data);
                                cell.data = renames[cell.data] + "ID" + cell.tag;
                            }
                            break;
                        }
                        
                        if (cell.car.type == "symbol-env"){
                            f_arrays.push(cell.car.data);
                            renames[cell.car.data] = gensym(cell.car.data);
                            cell.car.data = renames[cell.car.data] + "ID" +  cell.car.tag;
                        }
                        cell = cell.cdr;
                    }



                    
                    var body = code.cdr.cdr.car;
                    rename(body,renames);

                    for (var i=0;i<f_arrays.length;i++){
                        renames[f_arrays[i]] = null;
                    }

                }else if (ope == "if"){
                    rename(code.cdr.car,renames);
                    rename(code.cdr.cdr.car,renames);
                    rename(code.cdr.cdr.cdr.car,renames);
                }else if (ope == "set!" || ope == "define"){
                    if (renames[code.cdr.car.data]){
                        code.cdr.car.data = renames[code.cdr.car.data] + "ID"+code.tag;
                    }
                    rename(code.cdr.cdr.car,renames);
                }


            }else{
                var cell = code;
                while (cell){
                    if (cell.car){
                        rename(cell.car,renames);
                    }
                    cell = cell.cdr;
                }
            }
            

        }else{
            if (code.type == "symbol-env"){
                if (renames[code.data]){
                    code.data = renames[code.data] + "ID" + code.tag;
                }
            }
        }   
    }
    rename(code,{});

}
















Syntax_rules.match_and_convert = function(rule_obj,code,env,unique){
    console.log(rule_obj);
    var ret = null;
    var match_flag = false;
    for (var i=0;i<rule_obj.size;i++){

        var is_match = Syntax_rules.match(rule_obj.patterns[i],code,rule_obj.pattern_vars_nest[i],rule_obj.ellipsis);
        console.log("MATCH????");
        console.log("MATCH????");
        console.log("MATCH????");
        console.log("MATCH????");
        console.log("MATCH????");
        console.log("MATCH????");
        console.log("MATCH????");
        console.log("MATCH????");
        console.log("MATCH????");
        console.log("MATCH????");
        console.log("MATCH????");
        console.log("MATCH????");
        console.log("");
        console.log("");
        console.log("");
        if (is_match){
            list_write(rule_obj.templates[i]);
            list_write(rule_obj.patterns[i]);
            console.log(is_match);
            console.log(is_match["?arg"]);
            console.log("MATCH!");
            ret = Syntax_rules.expand_template(rule_obj.templates[i],is_match,rule_obj.ellipsis,env,unique);
                       
            match_flag = true;
            break;
        }
    }

    if (match_flag == false){
      console.log("ERROR::syntax-rules");
      error();
      return null;
    }
    return ret;
}


