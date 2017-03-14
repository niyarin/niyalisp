var is_node = typeof require !==  "undefined";

/**
 * @namespace
 */
Niyalisp_code = {};

if (is_node){
    module.exports = Niyalisp_code;
}



Niyalisp_code.Niyalisp_code = function(vm_code,const_data,const_ids,procedures){
    this.vmcode = vm_code;
    this.const_data = const_data;
    this.const_ids = const_ids;
    this.procedure = procedures;
    this.js_code = [];
}

/**
 * SHIFT FUNCTION ADDR
 */
Niyalisp_code.add_fun_addrs = function(ncode,s_addr){
    for (var i=0;i<ncode.vmcode.length;i++){
        for (var j=0;j<ncode.vmcode[i].length;j++){
            console.log(ncode.vmcode[i][j]);
            if (ncode.vmcode[i][j][0] == "PUSH_FUN"){
                ncode.vmcode[i][j][1]+=s_addr;
            }
        }
    }

    for (var i=0;i<ncode.procedure.length;i++){
        for (var j=0;j<ncode.procedure[i][2].length;j++){
            if (ncode.procedure[i][2][j][0] == "PUSH_FUN"){
                ncode.procedure[i][2][j][1]+=s_addr;
            }
        }
    }
    
}




Niyalisp_code.concat = function(niyalisp_codes){
    var ret = niyalisp_codes[0];
    for (var i=1;i<niyalisp_codes.length;i++){
        var a = niyalisp_codes[i];
        var shift_addr = ret.procedure.length;
        Niyalisp_code.add_fun_addrs(a,shift_addr);
        //+ (add const addr )
        for (var j=0;j<a.vmcode.length;j++){
            ret.vmcode.push(a.vmcode[j]);
        }
        for (var j=0;j<a.procedure.length;j++){
            ret.procedure.push(a.procedure[j]);
        }
    }
    return ret;
}



//global の begin は展開したい
