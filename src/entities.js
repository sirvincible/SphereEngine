class entity {

	constructor(id, c, t, r, x, y, z) {

		this.id = id;
		this.c = c;
		this.type = t;
		this.radius = r;

		this.actual = new SpherePoint(x, y, z);
		this.rotate = new SpherePoint(x, y, z);
	
		return this;
	}
}


class Dot extends entity {

	constructor(id, c, t, r, x, y, z) {

		super(id, c, t, r, x, y, z);

		//for movable only
		this.lock = -1;		
		this.PRIME = -1;

		this.origin = new SpherePoint(x, y, z); 
		   
		this.xProject = 0;
		this.yProject = 0;
		this.sizeProjection = 0;
	
		//for terrain only (reimplemented later)
		this.texture0 = null;
		this.texture1 = null;
		if (this.type == "TERRAIN") this.texture0 = iOCEAN;

	
		//temporary global values to trouble-shoot destination-point calculation issue		
		this.di = 0;
		this.brng = 0;
		this.phi = 0;
		this.theta = 0;
	}
	
	// Draw the dot on the canvas
	draw() {

		this.project();
	
		ctx.beginPath();
		ctx.globalAlpha = this.sizeProjection;
		ctx.fillStyle = this.c;
		ctx.arc(this.xProject, this.yProject, this.radius * this.sizeProjection, 0, Math.PI * 2);
		ctx.closePath();
		ctx.fill();
	}
						
	project() {

		this.rotate = sUI.rotate(this.rotate.x, this.rotate.y, this.rotate.z);
		
		this.normalizeActualRotation();

		//calculate 3D projection on 2D canvas				  		  		
		this.sizeProjection = PERSPECTIVE / (PERSPECTIVE - this.rotate.z);		
		this.xProject = (this.rotate.x * this.sizeProjection) + PROJECTION_CENTER_X;
  		this.yProject = (this.rotate.y * this.sizeProjection) + PROJECTION_CENTER_Y;
  	}
  	
  	normalizeActualRotation() {	

		//calculate distance from origin
		//Using atan2(z, Math.sqrt(x*x + y*y)) to calculate PHI for angular distance
		//When acos(z/r) is used, the angular distance is not accurate for distances beyond the equator of the sphere (when z < 0)
		//ophi, otheta is the origin polar coordinate (POINT1)
		//dphi, dtheta is the destination polar coordinate (POINT2)
		//this function is created to test the formula for calculating "Destination point given distance and bearing from start point"
		//the intent is to plug the origin coordinates (POINT1) in for POINT3 with the expected output for POINT4 as the destination polar coordinate (POINT2)
		
		//The reason for the madness is to enable server-side scalability - a server will maintain absolute coordinates for all points,
		//and the client browser will maintain the rotation coordinates for each point on the sphere - we'll have to normalize the two sets of coordinates
		//this solution will only work for client side coding until this algorithm is solved
		
		const ophi = this.wrap90(Math.atan2((this.origin.z - GLOBE_CENTER_Z), Math.sqrt((this.origin.x*this.origin.x) + (this.origin.y*this.origin.y))));
		const otheta = this.wrap180(Math.atan2(this.origin.y, this.origin.x));

		const dphi = this.wrap90(Math.atan2((this.actual.z - GLOBE_CENTER_Z), Math.sqrt((this.actual.x*this.actual.x) + (this.actual.y*this.actual.y))));
		const dtheta = this.wrap180(Math.atan2(this.actual.y, this.actual.x));
		
		const angdi = this.calculateAngDi(ophi, otheta, dphi, dtheta);
		this.di = GLOBE_RADIUS * angdi;		
		
        // bearing p1-p2
        const ophi1 = this.wrap90(Math.acos((this.origin.z - GLOBE_CENTER_Z)/ GLOBE_RADIUS));
		const dphi1 = this.wrap90(Math.acos((this.actual.z - GLOBE_CENTER_Z)/ GLOBE_RADIUS));
		const dt = dtheta - otheta;
		
        const x = Math.cos(ophi1) * Math.sin(dphi1) - Math.sin(ophi1) * Math.cos(dphi1) * Math.cos(dt);
        const y = Math.sin(dt) * Math.cos(dphi1);
        this.brng = this.wrap360(Math.atan2(y, x));
	
		// setting DOT3 (PHI, THETA) as the Origin Polar coordinates to prove algorithm - PHI, THETA of actual.x,y,z should always equal calculated PHI, THETA values
		const PHI3 = ophi1;
		const THETA3 = otheta;
				
        // p4 (φ4,λ4): destination from p3	
        // this calculation only inconsistently works when Z is positive (i.e. the northern hemisphere) the alternative equation below reliably works anywhere on the sphere	
        //********// const sinPHI = Math.sin(PHI3) * Math.cos(angdi) + Math.cos(PHI3) * Math.sin(angdi) * Math.cos(this.brng);
		//********// this.phi = Math.asin(sinPHI);

		const phi = this.wrap90(PHI3 - (ophi1 - dphi1));        
		if ((this.actual.z-GLOBE_CENTER_Z) < 0) this.phi = (Math.PI/2) + ((Math.PI/2) - phi);
		else this.phi = phi;
		
		//Theta is still not calculating correctly - assessing the variables - we know that angdi, PHI3 & this.phi must be accurate -
		//which suggests the only variable not calculated correctly in this equation is this.brng
        const y1 = Math.sin(this.brng) * Math.sin(angdi) * Math.cos(PHI3);
        const x1 = Math.cos(angdi) - Math.sin(PHI3) * Math.sin(this.phi);
		this.theta = this.wrap180(THETA3 + Math.atan2(y1, x1));        	
	}

	//***************** Primary entity logic - drives basic movement / plotting behavior
	primary() {
	
		if (this.PRIME != -1) {
			this.move(this.PRIME);
		}
	}	
		
	move(id) {
	
		this.lockPolar(id, false);
			
		//this.navigateGreatCircle(false, dots[id].PHI(false), dots[id].THETA(false));	
		this.navigateGreatCircle(false, dots[id].PHI(true), dots[id].THETA(true));	

		
		this.collision();		
	}
	
	//***************** PHI (LAT) & THETA (LONG) Calculation Functions from Spherical Cartesian Coordinates (movable entities only)
	PHI(transform) {
		//return Math.acos((this.ztransform - GLOBE_CENTER_Z)/ GLOBE_RADIUS); Needs to be atan for GreatCircle Navigation to work

		if (transform) return Math.atan2((this.rotate.z - GLOBE_CENTER_Z), Math.sqrt((this.rotate.x*this.rotate.x) + (this.rotate.y*this.rotate.y)));
		else return Math.atan2((this.actual.z - GLOBE_CENTER_Z), Math.sqrt((this.actual.x*this.actual.x) + (this.actual.y*this.actual.y)));
	}
	
	THETA(transform) {
		if (transform) return Math.atan2(this.rotate.y, this.rotate.x);
		else return Math.atan2(this.actual.y, this.actual.x);
	}	
		
	//***************** Plot Path or Move Dot with Great Circle Navigation (movable entities only)
	navigateGreatCircle(plot, dphi, dtheta) {
		
		//const ophi = this.wrap90(this.PHI(plot));
		//const otheta = this.wrap180(this.THETA(plot));

		const ophi = this.wrap90(this.PHI(true));
		const otheta = this.wrap180(this.THETA(true));


		dphi = this.wrap90(dphi);
		dtheta = this.wrap180(dtheta);
		
		const angdi = this.calculateAngDi(ophi, otheta, dphi, dtheta);
		const di = GLOBE_RADIUS * angdi;
	
		if (plot) {
		
			for (let i = 0; i < di; i+=10) {
				var pGC = this.pointGreatCircle((i/di), angdi, ophi, otheta, dphi, dtheta);
				dots.push(new Dot(this.id, "red", "PLOT", 1, pGC.x, pGC.y, pGC.z));		
			}
			
		} else {
			var pGC = this.pointGreatCircle((3/di), angdi, ophi, otheta, dphi, dtheta);
			
			this.actual.x = pGC.x;
			this.actual.y = pGC.y;
			this.actual.z = pGC.z;
			
			this.rotate.x = pGC.x;
			this.rotate.y = pGC.y;
			this.rotate.z = pGC.z;
		}
	}
	
	calculateAngDi(ophi, otheta, dphi, dtheta) {

		const dp = dphi - ophi;
		const dt = dtheta - otheta;
		
		const ang = Math.sin(dp/2) * Math.sin(dp/2) + Math.cos(ophi) * Math.cos(dphi) * Math.sin(dt/2) * Math.sin(dt/2);
		
		return (2 * Math.atan2(Math.sqrt(ang), Math.sqrt(1-ang)));
	}
	
	pointGreatCircle(f, angdi, ophi, otheta, dphi, dtheta) {

		const a = Math.sin((1 - f) * angdi) / Math.sin(angdi);
		const b = Math.sin(f * angdi) / Math.sin(angdi);
			
		const x = a * Math.cos(ophi) * Math.cos(otheta) + b * Math.cos(dphi) * Math.cos(dtheta);
		const y = a * Math.cos(ophi) * Math.sin(otheta) + b * Math.cos(dphi) * Math.sin(dtheta);
		const z = a * Math.sin(ophi) + b * Math.sin(dphi);
			
		const phi = Math.acos(z, GLOBE_RADIUS);
		const theta = Math.atan2(y, x);
			
		const x1 = GLOBE_RADIUS * Math.sin(phi) * Math.cos(theta);
		const y1 = GLOBE_RADIUS * Math.sin(phi) * Math.sin(theta);
		const z1 = (GLOBE_RADIUS * Math.cos(phi)) + GLOBE_CENTER_Z;
						
		return (new SpherePoint(x1, y1, z1));
	}
	
	//***************** Plot Path Helper Functions (movable entities only)
	lockPolar(key, reset) {
					
		if (key != -1 && (reset || this.lock != key)) {
								
			this.resetCrumb();
			this.lock = key;
			
			this.navigateGreatCircle(true, dots[key].PHI(true), dots[key].THETA(true));	
		}		
	}
	
	resetCrumb() {

		for (let i = 0; i < dots.length; i++) {	
		
			if (dots[i].type == "PLOT") {
				dots.splice(i, 1);
				i--;
			}	
		}
	}
	
	//***************** Basic Collision Detection (movable entities only)	
	collision() {

		var dx = 0; 
		var dy = 0; 
		var dz = 0;
		var dr = 0;

		for (var i = 0; i < dots.length; i++) {

    		if (this.id == dots[i].id && dots[i].type == "DOT") continue;

			//dx = this.actual.x - dots[i].actual.x;
			//dy = this.actual.y - dots[i].actual.y;
			//dz = this.actual.z - dots[i].actual.z;
			dx = this.rotate.x - dots[i].rotate.x;
			dy = this.rotate.y - dots[i].rotate.y;
			dz = this.rotate.z - dots[i].rotate.z;
			dr = dots[i].radius;
			
			if (dots[i].type == "TERRAIN") dr = 2;
			
			if (Math.sqrt((dx * dx) + (dy * dy) + (dz * dz)) < this.radius + dr) {//dots[i].radius) {
    			
    			if (this.id == dots[i].id && dots[i].type == "PLOT") {
					dots.splice(i, 1);
					i--;
					
    			} else {
    			
    				dots[i].c = "green";
    				if (this.PRIME == i) {
    					dots[i].texture1 = null;
    					this.PRIME = -1;
    				}
    			}
			}
		}
	}
		
	//***************** Worldwrap Helper Functions (movable entities only)
    wrap360(r) {

    	var degrees = r * (180 / Math.PI);
    
        if (0<=degrees && degrees<360) return (degrees * (Math.PI / 180)); // avoid rounding due to arithmetic ops if within range
        return (((degrees%360+360) % 360) * (Math.PI / 180)); // sawtooth wave p:360, a:360
    }
			
    wrap180(r) {
    
    	var degrees = r * (180 / Math.PI);
    
        if (-180<degrees && degrees<=180) return (degrees * (Math.PI / 180)); 	// avoid rounding due to arithmetic ops if within range
        return (((degrees+540)%360-180) * (Math.PI / 180));						// sawtooth wave p:180, a:±180
    }

    wrap90(r) {
    	
    	var degrees = r * (180 / Math.PI);
    	    	
        if (-90<=degrees && degrees<=90) return (degrees * (Math.PI / 180)); 		// avoid rounding due to arithmetic ops if within range
        return ((Math.abs((degrees%360 + 270)%360 - 180) - 90) * (Math.PI / 180));	// triangle wave p:360 a:±90 TODO: fix e.g. -315°
    }
    
	//***************** Draw Function (terrain entities only)  
    drawTerrain() {

		this.project();

		if (this.sizeProjection < 0.8) return; //z is negative and element is over the horizon

		ctx.globalAlpha = 1;
		ctx.drawImage(this.texture0, this.xProject - this.radius, this.yProject - this.radius, (2 * this.radius * this.sizeProjection), (2 * this.radius * this.sizeProjection));
		if (this.texture1 != null) ctx.drawImage(this.texture1, this.xProject - this.radius, this.yProject - this.radius, (2 * this.radius * this.sizeProjection), (2 * this.radius * this.sizeProjection));
	}
}