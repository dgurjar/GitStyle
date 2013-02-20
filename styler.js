var canvas, context;
var char_width, char_height;

var opacity = {"match": 1, "comment": 1, "neg": 1, "base": 1};
var commits = [];
var comm = [];
var scale_factor = 1;

var min_opacity = .3;
var max_opacity = 1


//TODO: Include this to display modularity
//Vertical position of all functions
var functions = [];

var lastX, lastY;



function init(){
    char_width = 2.5;
    char_height = 5;

    canvas = document.getElementById('canvas'),
    context = canvas.getContext('2d');

    opacity.match 	= .3;
    opacity.comment = .3;
    opacity.neg 	= .3;
    opacity.base 	= .3;

	trackTransforms(context);


    /* Resize the canvas to fill browser window dynamically */
    window.addEventListener('resize', resizeCanvas, false);
    resizeCanvas();


    $("#plus").click(function(){
        scale_factor*=1.5;
        reDrawAll();
    });

    $("#minus").click(function(){
        scale_factor/=1.5;
        reDrawAll();
    });

	$("#sel_com").click(function(){
		opacity.comment = (opacity.comment == 1) ? min_opacity:max_opacity;
		reDrawAll();
	});

	$("#sel_match").click(function(){
		opacity.match = (opacity.match == 1) ? min_opacity:max_opacity;
		reDrawAll();
	});

	$("#sel_neg").click(function(){
		opacity.neg = (opacity.neg == 1) ? min_opacity:max_opacity;
		reDrawAll();
	});

	lastX = canvas.width/2;
	lastY = canvas.height/2;
	var dragStart,dragged;
	canvas.addEventListener('mousedown',function(evt){
		document.body.style.mozUserSelect = document.body.style.webkitUserSelect = document.body.style.userSelect = 'none';
		lastX = evt.offsetX || (evt.pageX - canvas.offsetLeft);
		lastY = evt.offsetY || (evt.pageY - canvas.offsetTop);
		dragStart = context.transformedPoint(lastX,lastY);
		dragged = false;
	},false);
	canvas.addEventListener('mousemove',function(evt){
		lastX = evt.offsetX || (evt.pageX - canvas.offsetLeft);
		lastY = evt.offsetY || (evt.pageY - canvas.offsetTop);
		dragged = true;
		if (dragStart){
			var pt = context.transformedPoint(lastX,lastY);
			context.translate(pt.x-dragStart.x,pt.y-dragStart.y);
			reDrawAll();
		}
	},false);
	canvas.addEventListener('mouseup',function(evt){
		dragStart = null;
	},false);

	var scaleFactor = 1.1;
	var zoom = function(clicks){
		var pt = context.transformedPoint(lastX,lastY);
		context.translate(pt.x,pt.y);
		var factor = Math.pow(scaleFactor,clicks);
		context.scale(factor,factor);
		context.translate(-pt.x,-pt.y);
		reDrawAll();
	}

	var handleScroll = function(evt){
		var delta = evt.wheelDelta ? evt.wheelDelta/40 : evt.detail ? -evt.detail : 0;
		if (delta) zoom(delta);
		return evt.preventDefault() && false;
	};
	canvas.addEventListener('DOMMouseScroll',handleScroll,false);
	canvas.addEventListener('mousewheel',handleScroll,false);
}

/* Resizes the canvas width and height based on the context */
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    lastX = canvas.width/2;
    lastY = canvas.height/2;
    context.clearRect(0,0,canvas.width,canvas.height);
    reDrawAll();
}

function trackTransforms(){
	var svg = document.createElementNS("http://www.w3.org/2000/svg",'svg');
	var xform = svg.createSVGMatrix();
	context.getTransform = function(){ return xform; };
	
	var savedTransforms = [];
	var save = context.save;
	context.save = function(){
		savedTransforms.push(xform.translate(0,0));
		return save.call(context);
	};
	var restore = context.restore;
	context.restore = function(){
		xform = savedTransforms.pop();
		return restore.call(context);
	};

	var scale = context.scale;
	context.scale = function(sx,sy){
		xform = xform.scaleNonUniform(sx,sy);
		return scale.call(context,sx,sy);
	};
	var rotate = context.rotate;
	context.rotate = function(radians){
		xform = xform.rotate(radians*180/Math.PI);
		return rotate.call(context,radians);
	};
	var translate = context.translate;
	context.translate = function(dx,dy){
		xform = xform.translate(dx,dy);
		return translate.call(context,dx,dy);
	};
	var transform = context.transform;
	context.transform = function(a,b,c,d,e,f){
		var m2 = svg.createSVGMatrix();
		m2.a=a; m2.b=b; m2.c=c; m2.d=d; m2.e=e; m2.f=f;
		xform = xform.multiply(m2);
		return transform.call(context,a,b,c,d,e,f);
	};
	var setTransform = context.setTransform;
	context.setTransform = function(a,b,c,d,e,f){
		xform.a = a;
		xform.b = b;
		xform.c = c;
		xform.d = d;
		xform.e = e;
		xform.f = f;
		return setTransform.call(context,a,b,c,d,e,f);
	};
	var pt  = svg.createSVGPoint();
	context.transformedPoint = function(x,y){
		pt.x=x; pt.y=y;
		return pt.matrixTransform(xform.inverse());
	}
}

/* Redraws the entire canvas using the current parameters */
function reDrawAll(){
	/* Clears the canvas */
	var p1 = context.transformedPoint(0,0);
	var p2 = context.transformedPoint(canvas.width,canvas.height);
	context.clearRect(p1.x,p1.y,p2.x-p1.x,p2.y-p1.y);

	for(var i = 0; i<commits.length; i++){
		drawCode(commits[i].code, commits[i].lang, i*scale_factor*80*char_width);
	}
}

/* Fetches new data from GitHub */
function update(){
	/* Clear the commit data  */
	commits = [];
	comm = [];

	/* Clear the context */
	var p1 = context.transformedPoint(0,0);
	var p2 = context.transformedPoint(canvas.width,canvas.height);
	context.clearRect(p1.x,p1.y,p2.x-p1.x,p2.y-p1.y);

	/* Parse the url to get necessary information */
	url = $("#url").val();
	var urlDat = parseURL(url);

	/* Bad url case */
	if(urlDat.success !== true){
		alert("Sorry, something is wrong with this URL. Try again.");
		return false;
	}

	$.getJSON("https://api.github.com/repos/" + urlDat.user + "/" + urlDat.repos + "/commits?callback=?", function(a) {
		/* Unable to fetch gitHub data */
		if(a.meta.status !== 200){
			alert("Unable to get data from Github, it is possible you have exceeded 60 requests. Try again in 1 hour.");
			return;
		}

  		//Populate the commits
  		for(var i = 0; i<a.data.length; i++){
  			comm[a.data.length-1-i] = a.data[i];
  		}

  		for(var i = 0; i<a.data.length; i++){
  			$.getJSON("https://api.github.com/repos/" + urlDat.user + "/" + urlDat.repos + "/contents/" + urlDat.fp + "?ref=" + comm[i].sha + "&callback=?", function(b){
				console.log(b);
				var code = Gh3.Base64.decode(b.data.content);
				var sha = b.data.url.split("ref=")[1];
				var index = getCommitIndex(sha, comm);

				if(index >= 0){
					commits[index] = {
						"code": code,
						"lang": urlDat.fp.split(".")[1],
						"sha": sha
					};
					drawCode(code, commits[index].lang, index*scale_factor*80*char_width);
				}
  			});
  		}
	});

	return false;
}

/* Get the index of the commmit given it's sha */
function getCommitIndex(sha){
    for(var i = 0; i<comm.length; i++){
        if(comm[i].sha === sha)
			return i;
	}
	return -1;
}

/* Given a string of code and a horizontal index, draws it */
function drawCode(code, language, h_index){

	/* Get the code line-by-line */
	var lines = code.split("\n");

	var commitDiv = $('<div class="commit">');
	commitDiv.css("left", h_index);

	highlighter = new (findBrush(language));

	//Clear vertical position of all functions
	functions = [];

	for(var i=0; i<lines.length; i++){
		if(lines[i].indexOf("function ") !== -1){
			functions.push(i*char_height*scale_factor)
		}
		var matches = SyntaxHighlighter.Highlighter.prototype.findMatches(highlighter.regexList, lines[i]);
		drawBase(lines[i], i, h_index, opacity.base);
		drawNegative(lines[i], i, h_index, opacity.neg);
		for(var j=0; j<matches.length; j++){
			drawMatch(matches[j], i, h_index, opacity.comment, opacity.match);
		}
	}

	drawFunctions(h_index);
}

function drawFunctions(h_index){
	for(var i=0; i<functions.length; i++){
		context.beginPath();
    	context.moveTo(h_index,functions[i]);
    	context.lineTo(scale_factor*80*char_width,functions[i]);
    	context.lineWidth = char_height/2;
    	context.strokeStyle = '#0000FF';
		context.stroke();
	}
}

/* Given a line, draws the code portion, leaving out the indentation */
function drawBase(line, v_index, h_index){

	context.beginPath();

	var trimmed = line.trim();
	length = trimmed.length;
	index = line.indexOf(trimmed);

	context.fillStyle = "rgba(150, 150, 150,"+min_opacity+")";

	var left = char_width*index*scale_factor+h_index;
	var top =  v_index*char_height*scale_factor;
	var width = length*char_width*scale_factor;
	var height = char_height*scale_factor;

	context.rect(left, top, width, height);

	context.fill();
}

/* Given a line, draws the code portion, leaving out the indentation */
function drawNegative(line, v_index, h_index, opacity){

	context.beginPath();

	var trimmed = line.trim();
	length = line.indexOf(trimmed);
	index = 0;

	context.fillStyle = "rgba(150, 50, 50,"+opacity+")";

	var left = char_width*index*scale_factor+h_index;
	var top =  v_index*char_height*scale_factor;
	var width = length*char_width*scale_factor;
	var height = char_height*scale_factor;

	//ret.click(function(){toggleElementLight("neg")});

	context.rect(left, top, width, height);

	context.fill();
}

/* Given a match and a horizontal index, draws the code*/
function drawMatch(match, v_index, h_index, opacity_comm, opacity_match){

	context.beginPath();

	if(match === null)
		return;

	if(match.css == "comments"){
		context.fillStyle = "rgba(255, 255, 255,"+opacity_comm+")";
	}
	else{
		context.fillStyle = "rgba(200, 200, 200,"+opacity_match+")";
	}

	var left = char_width*match.index*scale_factor+h_index;
	var top =  v_index*char_height*scale_factor;
	var width = match.length*char_width*scale_factor;
	var height = char_height*scale_factor;

	context.rect(left, top, width, height);

	context.fill();
}


/* Given the parent div and the new opacity, sets this for all of the sub elements */
function dimSubElements(parent, opacity){
	var children = parent.children();
	for (var i=0; i<children.length; i++){
		/* Change opacity so long as class is not in exception list */
		if(!exclude[children[i].className] === true){
			children[i].style.opacity = opacity;
		}
	}
}


/* Given a URL (passed in by the user), parses all of the needed information to get repository information */
function parseURL(url){
	if(url.split("github.com/").length !== 2)
		return {"success": false};

	var path = url.split("github.com/")[1].split("/");
	var user = path[0];
	var repos = path[1];
	var fp = url.split("master/")[1];

	return {"success": true, "user": user, "repos": repos, "fp": fp};
}

/* Given an alias of a brush, returns the brush if found or null otherwise */
function findBrush(alias){
	for(var brush in SyntaxHighlighter.brushes){
		var aliases = SyntaxHighlighter.brushes[brush].aliases;
		if($.inArray(alias, aliases))
			return SyntaxHighlighter.brushes[brush];
	}
	return null;
}


window.onload = function(){
	init();
}
