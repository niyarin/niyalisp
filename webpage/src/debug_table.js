var is_node = typeof require !==  "undefined";


Debug_table = {};

if (is_node){
    var Lexer = require("./lexer");
    module.exports = Debug_table;
}



Debug_table.look_history = function(c_hist,m_hist,vm,output){
    var ret = "";
    for (var i=m_hist.length-1;i>-1;i--){
        var mh = m_hist[i];
        if (mh != "dummy"){
            ret += Debug_table.look_machine_code(mh,c_hist[i],vm) + "\n";
        }
    }
    output("\n----CALL HISTORY----\n\n");
    output(ret);
    
}


Debug_table.look_machine_code = function(line_p,fun,vm){
    var line = line_p[0];
    var ret_fun = [];
    var org_fun = null;

    var state = 0;
    for (var i=line.length-1;i>-1;i--){
        if (line[i][0] == "FUNC_RUN"){
            state = 1;
            continue;
        }else if (line[i][0] == "ARGS"){
            state = 2;
            continue;
        }

        if (state == 1){
            if (line[i][0] == "LOAD_GLOBAL"){
                var f = fun[0];
                var args = fun[1];

                if (f.type == "native"){
                    ret_fun.push(f["name"]);
                }else{
                    ret_fun.push("<proc>");
                }   
                for (var j=1;j<args.length;j++){
                    ret_fun.push(args[j]);
                }
                if (line[i].length == 3){
                    org_fun = Debug_table.search_code_pos(line[i][2],vm.org_code);
                }
                break;
            }else if (line[i][0] == "LOAD_L"){
                {
                    if (line[i].length == 3){
                        org_fun = Debug_table.search_code_pos(line[i][2],vm.org_code);
                    }
                }
            }else{
                //console.log("?",line,fun[0]);
            } 
        }else if (state == 2){
            if (line[i][0] == "LOAD_GLOBAL"){
                if (line[i].length == 3){
                    org_fun = Debug_table.search_code_pos_from_arg(line[i][2],vm.org_code);
                    break;
                }   
            }else{

            }
        }
    }

    //rebuild code
    var ret = "";
    if (org_fun){
        ret += "line:" + (Number(org_fun[1])+1) + " ";
        for (var i=0;i<org_fun[0].length;i++){
            if (org_fun[0][i] == "("){
                ret += "(";
            }else if (org_fun[0][i] == ")"){
                ret += ")";
            }else{
                ret += org_fun[0][i].data + " ";
            }
        }
    }
    return ret;
}


Debug_table.search_code_pos_from_arg = function(pos,org_code){
    var index = 0;
    for (var i=0;i<org_code.length;i++){
        if (typeof org_code[i] == "object"){
            if (org_code[i].line == pos){
                index = i;
            }
        }
    }
    
    //search-left
    var nest = 0;
    for (var i=index;i>-1;i--){
        if (org_code[i] == "("){
            nest ++;   
            if (nest == 1){
                index = i+1;
                break;
            }
        }else if (org_code[i] == ")"){
            nest--;
        }else{

        }
    }

    var ret = ["("];
    nest = 0;
    for (var i=index;i<org_code.length;i++){
        if (org_code[i] == "("){
            ret.push("(");
           nest++; 
        }else if (org_code[i] == ")"){
            ret.push(")");
            if (nest == 0){
                break;
            }
            nest--;
        }else{
            ret.push(org_code[i]);
        }
    }

    

    var lp = pos.split(" ");
    return [ret,lp[0]];
}



Debug_table.search_code_pos = function(pos,org_code){
    if (pos[0] == "l"){
        pos = pos.substring(2);
        return Debug_table.search_code_pos_from_arg(pos,org_code);
    }


    var index = 0;
    for (var i=0;i<org_code.length;i++){
        if (typeof org_code[i] == "object"){
            if (org_code[i].line == pos){
                index = i;
            }
        }
    }
    
    var ret = ["("];
    var nest = 0;
    for (var i=index;i<org_code.length;i++){
        if (org_code[i] == "("){
            ret.push("(");
           nest++; 
        }else if (org_code[i] == ")"){
            ret.push(")");
            if (nest == 0){
                break;
            }
            nest--;
        }else{
            ret.push(org_code[i]);
        }
    }
    var lp = pos.split(" ");
    return [ret,lp[0]];
}
