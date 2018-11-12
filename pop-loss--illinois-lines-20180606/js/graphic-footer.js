(function(root,factory){if(typeof module!=='undefined'&&module.exports)module.exports=factory();else if(typeof define==='function'&&define.amd)define([],factory);else root.canvid=factory();}(this,function(){function canvid(params){var defaultOptions={width:800,height:450,selector:'.canvid-wrapper'},firstPlay=true,control={play:function(){console.log('Cannot play before images are loaded');}},_opts=merge(defaultOptions,params),el=typeof _opts.selector==='string'?document.querySelector(_opts.selector):_opts.selector;if(!el)return console.warn('Error. No element found for selector',_opts.selector);if(!_opts.videos)return console.warn('Error. You need to define at least one video object');if(hasCanvas()){loadImages(_opts.videos,function(err,images){if(err)return console.warn('Error while loading video sources.',err);var ctx=initCanvas(),requestAnimationFrame=reqAnimFrame();control.play=function(key,reverse,fps){if(control.pause)control.pause();var img=images[key],opts=_opts.videos[key],frameWidth=img.width/opts.cols,frameHeight=img.height/Math.ceil(opts.frames/opts.cols);var curFps=fps||opts.fps||15,curFrame=reverse?opts.frames-1:0,wait=0,playing=true,loops=0,delay=60/curFps;requestAnimationFrame(frame);control.resume=function(){playing=true;requestAnimationFrame(frame);};control.pause=function(){playing=false;requestAnimationFrame(frame);};control.isPlaying=function(){return playing;};control.destroy=function(){control.pause();removeCanvid();};if(firstPlay){firstPlay=false;hideChildren();}function frame(){if(!wait){drawFrame(curFrame);curFrame=(+curFrame+(reverse?-1:1));if(curFrame<0)curFrame+=+opts.frames;if(curFrame>=opts.frames)curFrame=0;if(reverse?curFrame==opts.frames-1:!curFrame)loops++;if(opts.loops&&loops>=opts.loops)playing=false;}wait=(wait+1)%delay;if(playing&&opts.frames>1)requestAnimationFrame(frame);}function drawFrame(f){var fx=Math.floor(f%opts.cols)*frameWidth,fy=Math.floor(f/opts.cols)*frameHeight;ctx.clearRect(0,0,_opts.width,_opts.height);ctx.drawImage(img,fx,fy,frameWidth,frameHeight,0,0,_opts.width,_opts.height);}};if(isFunction(_opts.loaded))_opts.loaded(control);});}else if(opts.srcGif){var fallbackImage=new Image();fallbackImage.src=opts.srcGif;el.appendChild(fallbackImage);}function loadImages(imageList,callback){var images={},imagesToLoad=Object.keys(imageList).length;if(imagesToLoad===0)return callback('You need to define at least one video object.');for(var key in imageList){images[key]=new Image();images[key].onload=checkCallback;images[key].onerror=callback;images[key].src=imageList[key].src;}function checkCallback(){imagesToLoad--;if(imagesToLoad===0)callback(null,images);}}function initCanvas(){var canvas=document.createElement('canvas');canvas.width=_opts.width;canvas.height=_opts.height;canvas.classList.add('canvid');el.appendChild(canvas);return canvas.getContext('2d');}function hideChildren(){[].forEach.call(el.children,function(child){if(!child.classList.contains('canvid'))child.style.display='none';});}function removeCanvid(){[].forEach.call(el.children,function(child){if(child.classList.contains('canvid'))el.removeChild(child);});}function reqAnimFrame(){return window.requestAnimationFrame||window.webkitRequestAnimationFrame||window.mozRequestAnimationFrame||window.msRequestAnimationFrame||function(callback){return setTimeout(callback,1000/60);};}function hasCanvas(){var elem=document.createElement('canvas');return !!(elem.getContext&&elem.getContext('2d'));}function isFunction(obj){return typeof obj==='function'||!!(obj&&obj.constructor&&obj.call&&obj.apply);}function merge(){var obj={},key;for(var i=0;i<arguments.length;i++)for(key in arguments[i])if(arguments[i].hasOwnProperty(key))obj[key]=arguments[i][key];return obj;}return control;};return canvid;}));
var pymChild=null;var isMobile=false;var BREAKPOINTS=[375,600,1000];var IMAGE_FOLDER=PARAMS.image_folder;var IMAGE_WIDTH=+PARAMS.image_width;var IMAGE_HEIGHT=+PARAMS.image_height;var FRAMES=+PARAMS.frames;var COLS=+PARAMS.cols;var FRAMES_PER_SECOND=+PARAMS.frames_per_second;var onWindowLoaded=function(){pymChild=new pym.Child({renderCallback:render});pymChild.onMessage('on-screen',function(bucket){ANALYTICS.trackEvent('on-screen',bucket);});pymChild.onMessage('scroll-depth',function(data){data=JSON.parse(data);ANALYTICS.trackEvent('scroll-depth',data.percent,data.seconds);});};var render=function(containerWidth){if(!containerWidth)containerWidth=DEFAULT_WIDTH;var sprite=IMAGE_FOLDER+'/filmstrip-'+BREAKPOINTS[BREAKPOINTS.length-1]+'.jpg';for(var i=0;i<BREAKPOINTS.length;i++)if(i==0&&containerWidth<=BREAKPOINTS[i])sprite=IMAGE_FOLDER+'/filmstrip-'+BREAKPOINTS[i]+'.jpg';else if(containerWidth>BREAKPOINTS[(i-1)]&&containerWidth<=BREAKPOINTS[i])sprite=IMAGE_FOLDER+'/filmstrip-'+BREAKPOINTS[i]+'.jpg';var photoContainers=document.getElementById('graphic');while(photoContainers.hasChildNodes())photoContainers.removeChild(photoContainers.firstChild);var canvidControl=canvid({selector:'.photo',videos:{photo:{src:sprite,frames:FRAMES,cols:COLS,fps:FRAMES_PER_SECOND}},width:containerWidth,height:Math.floor(containerWidth*IMAGE_HEIGHT/IMAGE_WIDTH),loaded:function(){canvidControl.play('photo');if(pymChild)pymChild.sendHeight();}});};window.onload=onWindowLoaded;