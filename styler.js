var canvas, context;
var char_width, char_height;

var opacity = {"match": 1, "comment": 1, "neg": 1, "base": 1};
var commits = [];
var comm = [];
var scale_factor = 1;

var min_opacity = .15;
var max_opacity = 1

var max_height 	= window.innerWidth*2;
var max_width 	= window.innerWidth*2;

//TODO: Include this to display modularity
//Vertical position of all functions
var functions = [];



function init(){
	char_width = 2.5;
	char_height = 5;

    canvas = document.getElementById('canvas'),
    context = canvas.getContext('2d');

    opacity.match 	= .25;
    opacity.comment = .25;
    opacity.neg 	= .25;
    opacity.base 	= .25;

    /* Resize the canvas to fill browser window dynamically */
    window.addEventListener('resize', resizeCanvas, false);
   
    resizeCanvas();

	
	$("#plus").click(function(){
		scale_factor*=1.5;
		reDrawAll();
		//context.scale(2,2);
	});

	$("#minus").click(function(){
		scale_factor/=1.5;
		reDrawAll();
		//context.scale(.5,.5);
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
}

/* Resizes the canvas width and height based on the context */
function resizeCanvas() {
    canvas.width = max_width;
    canvas.height = max_height;
    reDrawAll(); 
}

/* Redraws the entire canvas using the current parameters */
function reDrawAll(){
	context.clearRect(0, 0, canvas.width, canvas.height);

	/* Replace the max height if necessary */
	var code_width = 2*80*char_width*commits.length*scale_factor;
	if(code_width > max_width)
		max_width = code_width;

	for(var i = 0; i<commits.length; i++){
		drawCode(commits[i].code, commits[i].lang, i*scale_factor*80*char_width);
	}

	//TODO: This is not working, figure out why
	//resizeCanvas();
}

/* Fetches new data from GitHub */
function update(){
	/* Clear the commit data  */
	commits = [];
	comm = [];

	/* Clear the context */
	context.clearRect(0, 0, canvas.width, canvas.height);

	/* Parse the url to get necessary information */
	url = $("#url").val();
	var urlDat = parseURL(url);

	/* Bad url case */
	if(urlDat.success !== true)
		return false;

	$.getJSON("https://api.github.com/repos/" + urlDat.user + "/" + urlDat.repos + "/commits?callback=?", function(a) {
  		//Populate the commits
  		for(var i = 0; i<a.data.length; i++){
  			comm[a.data.length-1-i] = a.data[i];
  		}

  		for(var i = 0; i<a.data.length; i++){
  			$.getJSON("https://api.github.com/repos/" + urlDat.user + "/" + urlDat.repos + "/contents/" + urlDat.fp + "?ref=" + comm[i].sha + "&callback=?", function(b){
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

	//Clear Vertical position of all functions
	functions = [];

	/* Replace the max height if necessary */
	var code_height = 2*lines.length*char_height*scale_factor;
	if(code_height > max_height)
		max_height = code_height;

	for(var i=0; i<lines.length; i++){
		var matches = SyntaxHighlighter.Highlighter.prototype.findMatches(highlighter.regexList, lines[i]);
		drawBase(lines[i], i, h_index, opacity.base);
		drawNegative(lines[i], i, h_index, opacity.neg);
		for(var j=0; j<matches.length; j++){
			drawMatch(matches[j], i, h_index, opacity.comment, opacity.match);
		}
	}

	drawFunctions(h_index);

	/* Commit elements light up when hovered over */
	//commitDiv.hover(function(){dimSubElements($(this), 1); $(this).css("z-index", 9999);}, function(){dimSubElements($(this), .25); $(this).css("z-index", $(this).position().left);});
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
