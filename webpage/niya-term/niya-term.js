var global_terms = [];


function term_update(term,input){
    var input_value = input.value;
    term.removeChild(input);
    
    var new_text_node =  document.createTextNode(input_value);
    var br = document.createElement("br");
    term.appendChild(new_text_node);
    term.appendChild(br);

    var term_wrapper = search_term_wrapper(term);
    term_wrapper.on(input_value);
    //on update
    
    input.value = "";
    term.appendChild(input);
    input.focus();
}


function term_print(nterm,data){
    if (typeof data!= "string"){
        return;
    }

    var elems = [];
    var s = "";
    for (var i=0;i<data.length;i++){
        if (data[i] == "\n"){
            if (s){
                var text_node = document.createTextNode(s);
                nterm.appendChild(text_node);
                s = "";
            }
            var br = document.createElement("br");
            nterm.appendChild(br);
        }else{
            s += data[i];
        }
    }
    if (s){
        var text_node = document.createTextNode(s);
        nterm.appendChild(text_node);
   
    }
}





function on_key(eve){
    var code = eve.keyCode;
    if (code == 13){
        console.log(eve);
        var tgt = eve.target;
        var nterm = tgt.parentNode;
        console.log(tgt);
        
        term_update(nterm,tgt);

    }
}

function onclick_term(eve){
    var children = eve.target.childNodes;
    for (var i=0;i<children.length;i++){
        if (children[i].tagName == "INPUT"){
            children[i].focus();
        }
    }
}



function niya_term_wrapper(nterm){
    this.pt = ">";
    this.nterm = nterm;
    this.input = null;
    this.call_back = null;

    this.prompt = function(){
        this.input = null;
        var cnodes = this.nterm.childNodes;
        for (var i=0;i<cnodes.length;i++){
            if (cnodes[i].tagName == "INPUT"){
                this.input = cnodes[i];
                break;
            }
        }


        if (this.input){
            var pt_text =  document.createTextNode(this.pt);
            this.nterm.insertBefore(pt_text,this.input);
        }else{
            var pt_text =  document.createTextNode(this.pt);
            this.nterm.appendChild(pt_text);
            
        }
    }

    this.setPrompt = function(pt){
        this.pt = pt;
    }

    this.setCallBack = function(f){
        this.call_back = f;
    }

    this.print = function(data){
        term_print(this.nterm,data);
    }

    this.println = function(data){
        term_print(this.nterm,data);
        term_print(this.nterm,"\n");
    }

    this.on = function(data){
        if (this.call_back){
            this.call_back(data,this);
        }
    }
}


function search_term_wrapper(nterm){
    for (var i=0;i<global_terms.length;i++){
        if (global_terms[i].nterm == nterm){
            return global_terms[i];
        }
    }
}


function create_niya_term_wrapper(nterm){
    var ret = new niya_term_wrapper(nterm);
    global_terms.push(ret);
    return ret;
}



