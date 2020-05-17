class SpherePoint {

	constructor(x, y, z) {
		this.x = x;
		this.y = y;
		this.z = z;
	}
}

//***************** future-state: Server-side Coding, Game-Logic - will-be replaced by receiving server-side updates
function engine() {

	for (var i = 0; i < dots.length; i++) {
		dots[i].primary();
	}

	setTimeout(engine, 44); 
}

//***************** screen / rendering Handlers
function onResize() {
	// We need to define the dimensions of the canvas to our canvas element
	width = canvas.offsetWidth;
	height = canvas.offsetHeight;
  
	// If the screen device has a pixel ratio over 1
	if (window.devicePixelRatio > 1) {
		canvas.width = canvas.clientWidth * 2;
		canvas.height = canvas.clientHeight * 2;
		ctx.scale(2, 2);
		
	} else {
		canvas.width = width;
		canvas.height = height;
	}
}

function render() {
	ctx.clearRect(0, 0, width, height);	// Clear the scene from top left to bottom right
	
	//The shape of the globe
	ctx.beginPath();
	ctx.arc(PROJECTION_CENTER_X, PROJECTION_CENTER_Y, (GLOBE_RADIUS*0.74), 0, 2 * Math.PI);
	ctx.closePath();
	ctx.stroke();

/*	Depth Sorting - will create again later, ***** when re-implementing terrains, render terrains first, then movable dots
	for (let i = 0; i < dots.length; i++) {
		dots[i].project();
	}
  
	// Sort dots array based on their projected size
	dots.sort((dot1, dot2) => {
		return dot1.sizeProjection - dot2.sizeProjection;
	});
*/

	// Loop through the dots array and draw every dot		
	for (var i = 0; i < dots.length; i++) {
		dots[i].draw();		
	}

	sUI.rotationReset();
	
	displayText();
	        		
	window.requestAnimationFrame(render);	// Request the browser the call render once its ready for a new frame
}

//***************** Sphere Handler
class sphere_Handler {

	constructor() {
	
		this.transform = new SpherePoint(0, 0, 0);
	
		this.rotationX = 0;
		this.rotationY = 0;
	}

	rotationHandler(x, y) {
	
		this.rotationX -= x;		
		this.rotationY -= y;
	}
	
	rotationReset() {

		this.rotationX = 0;
		this.rotationY = 0;	
	}
	
	sinX() {	
		return Math.sin(this.rotationX);
	}
	
	cosX() {
		return Math.cos(this.rotationX);
	}

	sinY() {
		return Math.sin(this.rotationY);
	}
	
	cosY() {
		return Math.cos(this.rotationY);
	}
	
	rotate(x, y, z) {

		this.transform = new SpherePoint(x, y, z);

		this.transform = this.rotateYHandler(this.transform.x, this.transform.y, this.transform.z);
		this.transform = this.rotateXHandler(this.transform.x, this.transform.y, this.transform.z);		
	
		return this.transform;
	}
	
	//Rotation X functions	
	rotateXHandler(x, y, z) {
	
		//calculate X rotation						
		const rotX = (this.cosX() * x) - (this.sinX() * (z - GLOBE_CENTER_Z));
		const rotY = y;
		const rotZ = (this.sinX() * x) + (this.cosX() * (z - GLOBE_CENTER_Z)) + GLOBE_CENTER_Z;
		
		return (new SpherePoint(rotX, rotY, rotZ));
	}

	//Rotation Y functions	
	rotateYHandler(x, y, z) {
	
		//calculate y rotation						
		const rotX = x;
		const rotY = (this.cosY() * y) - (this.sinY() * (z - GLOBE_CENTER_Z));
		const rotZ = (this.sinY() * y) + (this.cosY() * (z - GLOBE_CENTER_Z)) + GLOBE_CENTER_Z;
		
		return (new SpherePoint(rotX, rotY, rotZ));
	}

	//Select an entity on the sphere
	select(x, y) {

		var dx = 0; 
		var dy = 0;

		for (var i = 0; i < dots.length; i++) {

			if (dots[i].sizeProjection < 0.74) continue; //z is negative and element is un-selectable

			dx = x - dots[i].xProject;
			dy = y - dots[i].yProject;
			
			if (Math.sqrt((dx * dx) + (dy * dy)) < (dots[i].sizeProjection * dots[i].radius) && (dots[i].type == "DOT" || dots[i].type == "TERRAIN")) {
    			
    			if (dots[i].id == 0) continue;
    			
    			if (dots[0].PRIME != -1) {
					dots[dots[0].PRIME].texture1 = null;
					dots[dots[0].PRIME].c = "black";
    			}
    			
    			if (dots[i].type == "TERRAIN") dots[i].texture1 = iSELECT;
    			if (dots[i].type == "DOT") dots[i].c = "red";
    			    			
    			dots[0].PRIME = dots[i].id;

				return;
			}
		}	
	}
}

//***************** Element Handler - make elements UX draggable
function element_Handler(elmnt, isCanvas) {
	var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

	elmnt.onmousedown = dragMouseDown;

	function dragMouseDown(e) {
		e = e || window.event;
		e.preventDefault();
        
		// get the mouse cursor position at startup:
		pos3 = e.clientX;
		pos4 = e.clientY;

		document.onmousemove = elementDrag;
		document.onmouseup = closeDragElement;
				
		if (isCanvas) sUI.select(e.clientX, e.clientY);
	}

	function elementDrag(e) {
		e = e || window.event;
		e.preventDefault();
		
		// calculate the new cursor position:
		pos1 = e.clientX - pos3;
		pos2 = e.clientY - pos4;
		pos3 = e.clientX;
		pos4 = e.clientY;
				
		if (isCanvas) sUI.rotationHandler((pos1/GLOBE_RADIUS), (pos2/GLOBE_RADIUS));
		else {
			elmnt.style.top = (elmnt.offsetTop + pos2) + "px";
			elmnt.style.left = (elmnt.offsetLeft + pos1) + "px";
		}
	}

	function closeDragElement() {
		//stop moving when mouse button is released	
		document.onmouseup = null;
		document.onmousemove = null;		
	}
}

//***************** Keyboard Handler - respond to keyboard inputs
function keyboard_Handler() {
	
	if (event.key == "t") {
	}
	
	if (dots[0].PRIME != -1) {

		if (event.key == "o") dots[dots[0].PRIME].texture0 = iOCEAN;
		if (event.key == "m") dots[dots[0].PRIME].texture0 = iMOUNTAIN;
		if (event.key == "d") dots[dots[0].PRIME].texture0 = iDESERT;
		if (event.key == "f") dots[dots[0].PRIME].texture0 = iFOREST;
		if (event.key == "b") dots[dots[0].PRIME].texture0 = iBARREN;
	}
}

//***************** Texture Loaders
function loadTextures() {

	var iOCEAN = new Image();
	iOCEAN.src = "./textures/blue.png";

	var iSELECT = new Image();
	iSELECT.src = "./textures/select.png";

	var iFOREST = new Image();
	iFOREST.src = "./textures/green.png";

	var iMOUNTAIN = new Image();
	iMOUNTAIN.src = "./textures/gray.png";

	var iDESERT = new Image();
	iDESERT.src = "./textures/tan.png";

	var iBARREN = new Image();
	iBARREN.src = "./textures/brown.png";
}

function loadDots() {
//*****************

	for (let i = 0; i < 400; i++) {

		const theta = Math.random() * 2 * Math.PI; // X has front and back - Random value between [0, 2PI]
		const phi = Math.acos((Math.random() * 2) - 1); // Y only has a front - Random value between [-1, 1] - outputs random value from 0 to PI
    
		// Calculate the [x, y, z] coordinates of the dot along the globe
		const x = GLOBE_RADIUS * Math.sin(phi) * Math.cos(theta);
		const y = GLOBE_RADIUS * Math.sin(phi) * Math.sin(theta);
		const z = (GLOBE_RADIUS * Math.cos(phi)) + GLOBE_CENTER_Z;
	
		if (i == 0) dots.push(new Dot(0, "red", "DOT", 5, x, y, z));
		else dots.push(new Dot(i, "black", "DOT", 5, x, y, z));
	}

	dots.push(new Dot(dots.length, "orange", "DOT", 10, GLOBE_RADIUS * Math.sin(0) * Math.cos(0), GLOBE_RADIUS * Math.sin(0) * Math.sin(0), (GLOBE_RADIUS * Math.cos(0)) + GLOBE_CENTER_Z));
	dots.push(new Dot(dots.length, "orange", "DOT", 10, GLOBE_RADIUS * Math.sin(Math.PI) * Math.cos(0), GLOBE_RADIUS * Math.sin(Math.PI) * Math.sin(0), (GLOBE_RADIUS * Math.cos(Math.PI)) + GLOBE_CENTER_Z));


//*****************
/*
	let plus = 0;

	for (let p = 0; p < Math.PI; p +=Math.PI/(GLOBE_RADIUS/14)) {

		for (let t = -Math.PI; t < Math.PI; t+=plus) {
		
			const x = GLOBE_RADIUS * Math.sin(p) * Math.cos(t);
			const y = GLOBE_RADIUS * Math.sin(p) * Math.sin(t);
			const z = (GLOBE_RADIUS * Math.cos(p)) + GLOBE_CENTER_Z;
			
			dots.push(new Dot(dots.length, "black", "TERRAIN", 25, x, y, z));
			plus = (2*Math.PI)/Math.round((2 * Math.PI * Math.sqrt((x*x) + (y*y)))/42);			
		}
	}
*/
}