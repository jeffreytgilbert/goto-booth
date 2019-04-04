// Browser driver support specifics
var canvas, context;
// Renderer specifics
var camera, scene, renderer, controls, helper;
var cylGeom, cylMat, boxGeom, boxMat, box, cylinder;
var THREE = window.THREE || {};
var boxRotationDims = {
	x: 0,
	y: 0
};
var pageCenterDims = {
	x: 0,
	y: 0,
	width: 0,
	height: 0
};
var cameraOriginDims = {
	x: 0,
	y: 0,
	z: 1
};
// var cameraHoverDistance = 150;
var cameraHoverDistance = 65;
//var meshes = [];
var frustumSize = 1000;

function rads(degrees) {
	return THREE.Math.degToRad(degrees); //  * Math.PI / 180;
}

function init() {
	
	var aspect = window.innerWidth / window.innerHeight;
	scene = new THREE.Scene();

	scene.matrixAutoUpdate = false;
	
	var fogColor = new THREE.Color(0x000000);
	scene.background = fogColor;
	scene.fog = new THREE.Fog(fogColor, 20, 60);	

	// PerspectiveCamera( fov : Number, aspect : Number, near : Number, far : Number )
	camera = new THREE.PerspectiveCamera(70, aspect, 10, 60); // 40

	camera.matrixAutoUpdate = false;

	/*
	helper = new THREE.CameraHelper(camera);
	scene.add(helper);
		
	// show me x/y/z grids
	
	var size = 20;
	var divisions = 20;

	var xGridHelper = new THREE.GridHelper(size, divisions);
	xGridHelper.position.x = 0;
	xGridHelper.position.y = 0;
	xGridHelper.position.z = 0;
	xGridHelper.rotation.x = rads(90);
	scene.add(xGridHelper);
	
	var yGridHelper = new THREE.GridHelper(size, divisions);
	yGridHelper.position.x = 0;
	yGridHelper.position.y = 0;
	yGridHelper.position.z = 0;
	yGridHelper.rotation.y = rads(90);
	scene.add(yGridHelper);
	
	var polarGridHelper = new THREE.PolarGridHelper(size, divisions, 8, 64, 0x0000ff, 0x808080);
	polarGridHelper.position.y = 0;
	polarGridHelper.position.x = 0;
	polarGridHelper.position.z = 0;
	polarGridHelper.rotation.z = rads(90);
	scene.add(polarGridHelper);
	*/
	drawLetters(scene);
	
	// WebGL 2 looks to be supported in Chrome and FF, but not in Safari Tech Preview very well.
	canvas = document.createElement('canvas');
	canvas.style.background = '#000';
	context = canvas.getContext('webgl2'); // webgl2 for that engine
	renderer = new THREE.WebGLRenderer({
		canvas: canvas,
		context: context,
		antialias: true
	});
	
	renderer.setSize(window.innerWidth, window.innerHeight);

	scene.updateMatrix();

	document.body.appendChild(renderer.domElement);
	
}

// shapes pre-organized into buckets based on angle ranges so we can rotate only the ones in view
var meshBuckets = {};
var totalBuckets = 120;
var bucketAngleSize = 360 / totalBuckets;

function assignToBucket (mesh) {
	var p1 = { x:0, y:0},
		p2 = { x: mesh.position.y, y: mesh.position.z };
	
	// angle in radians
//	var angleRads = Math.atan2(p2.y - p1.y, p2.x - p1.x);
	
	// angle in degrees to get to letter point
	var angleToLetterDeg = (Math.atan2(p2.x - p1.x, p2.y - p1.y) * 180 / Math.PI);
	
	// number of times the bucket angle size goes into the angle to the letter
	var bucketSlice = Math.floor(angleToLetterDeg / bucketAngleSize);
	// put the letter in a bucket lesser than the next angle
	// var bucketAngle = (bucketSlice * bucketAngleSize) + 180;

	var bucketAngle = (bucketSlice * bucketAngleSize);
	bucketAngle = bucketAngle < 0 ? bucketAngle + 360 : bucketAngle;

	if (!meshBuckets[bucketAngle]) {
		meshBuckets[bucketAngle] = [];
	}
	meshBuckets[bucketAngle].push(mesh);
}

var resizeThrottle;

function onWinResize() {
	if(resizeThrottle) clearTimeout(resizeThrottle);
	resizeThrottle = setTimeout(()=>{
		renderer.setSize( window.innerWidth, window.innerHeight );
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();
	
		pageCenterDims.width = window.innerWidth / 2;
		pageCenterDims.height = window.innerHeight / 2;
	}, 100);
}

function onMouseMove(e) {
	boxRotationDims.x = (pageCenterDims.width - e.pageX) * 0.01;
	boxRotationDims.y = (pageCenterDims.height - e.pageY) * 0.01;
}

var angle = 0;

function render () {
	
	angle = (angle + 0.1) % 360;
	
	let rotation = rads(angle + 270);
	hideCulledMeshes(rotation);

	camera.position.x = cameraOriginDims.x + (boxRotationDims.x * -1);
	camera.position.y = cameraHoverDistance * Math.cos(rads(angle));
	camera.position.z = cameraHoverDistance * Math.sin(rads(angle));
	camera.rotation.x = rads(angle + 270);
	camera.rotation.y = (cameraOriginDims.x + (boxRotationDims.x * -1)) * 0.05;
	camera.updateMatrix();

	// Scenes 
//	scene.matrixWorldNeedsUpdate = false;

	renderer.render(scene, camera);
};

/*
	// Calculate the rotation angle of the camera
	let origin = { x:0, y:0 },
		cameraPos = { x: camera.position.y, y: camera.position.z },
		angleRads = Math.atan2(cameraPos.y - origin.y, cameraPos.x - origin.x); //  * 180 / Math.PI

	if (angleRads > 2*Math.PI) {
		angleRads = angleRads % (2*Math.PI);
	}

	// calculate the 
	let minAngle = angleRads + (Math.PI/2), // angleDeg - 90,
		maxAngle = angleRads - (Math.PI/2); // angleDeg + 90;
	
	if (minAngle > 2*Math.PI) { minAngle = minAngle % (2*Math.PI); }
	if (maxAngle > 2*Math.PI) { maxAngle = maxAngle % (2*Math.PI); }
*/

function isInView(bucketAngle, angleDeg) {
	var min, max;

	if(angleDeg < 90) {
		min = (angleDeg + 360) - 90;
		max = angleDeg + 90;
		return (bucketAngle < max) || // if 1 then buckets less than 91 are in view
			(bucketAngle > min) // if 1 then buckets greater than 271 are in view
	} else if (angleDeg > 270) {
		min = angleDeg - 90;
		max = ((angleDeg + 360) + 90) % 360;
		return (bucketAngle < max) || // if 271 then buckets less than 1 are in view
			(bucketAngle > min) // if 271 then buckets greater than 181 are in view
	} else {
		min = angleDeg - 90;
		max = angleDeg + 90;
		return (bucketAngle <= max) && // if 180 then buckets less than 270 are in view
			(bucketAngle >= min) // if 180 then buckets greater than 90 are in view
	}
}


function hideCulledMeshes (rotation) {
	// Calculate the rotation angle of the camera
	var origin = { x:0, y:0 },
		cameraPos = { x: camera.position.y, y: camera.position.z };
	var angleDeg = (Math.atan2(cameraPos.x - origin.x, cameraPos.y - origin.y) * 180 / Math.PI);

	// atan returns -179 through -0.001 beyond 180 degress, so add 360 to give us the positive angles rather than a negative bucket angle
	angleDeg = angleDeg < 0 ? angleDeg + 360 : angleDeg;

	if (!meshBuckets || !Object.keys(meshBuckets) || Object.keys(meshBuckets).length === 0) { return; }

	for(let sliceAngle in meshBuckets) {
//		console.log(sliceAngle);
		if (!isInView(+sliceAngle, angleDeg)) {
			meshBuckets[sliceAngle].forEach((mesh)=>{
				mesh.visible = false;
				mesh.matrixWorldNeedsUpdate = false;
			}) 
		} else {
			meshBuckets[sliceAngle].forEach((mesh)=>{
				mesh.visible = true;
				mesh.matrixWorldNeedsUpdate = true;
			}) 
		}
	}

// 	var activeSlice = Math.floor( angleDeg / bucketAngleSize) * bucketAngleSize;


// 	// only update one bucket right now, just to see something render with new buckets.
// 	if (meshBuckets[ activeSlice ] && meshBuckets[ activeSlice ].length > 0) {

// 		// this was changing the angle of the meshes in view at the 0 y axis (traditional graph not scene geo), 
// 		// but we need make visible the > +90 degree and disapear the > -91 degree slice so it adds them and subtracts them as needed

// 		meshBuckets[ activeSlice ].forEach((mesh) => {
// //			mesh.rotation.x = rotation;
// 		});

// 		console.log( 'slice size', meshBuckets[ activeSlice ].length );
// 	} else {
// 		console.log('Empty slice', activeSlice, meshBuckets[ activeSlice ], rotation, angleDeg, bucketAngleSize);
// 	}
}

function animate() {
	requestAnimationFrame(animate);
	render();
}

function perc2color(perc, min, max) {
	var base = (max - min);
	
	if (base == 0) {
		perc = 100;
	} else {
		perc = (perc - min) / base * 100;
	}
	var r, g, b = 0;
	if (perc < 50) {
		r = 255;
		g = Math.round(5.1 * perc);
	} else {
		g = 255;
		r = Math.round(510 - 5.10 * perc);
	}
	var h = r * 0x10000 + g * 0x100 + b * 0x1;
	return '#' + ('000000' + h.toString(16)).slice(-6);
}

function minMaxRand(min, max) {
	return Math.random() * (max - min) + min;
}

function generateCylinder(centerPoint, edgePoint, density, height, numHeightSteps) {
	var DEFAULT_RADIUS_INCREMENTS = 20;
	var DEFAULT_ANGLE_INCREMENTS =  .05;
	var DEFAULT_SPIRAL = 150;
	
	var radiusIncrement = density * DEFAULT_RADIUS_INCREMENTS;
	var angleIncrement = 2*Math.PI / (density * DEFAULT_ANGLE_INCREMENTS);
	var numSpirals = density * DEFAULT_SPIRAL;
	
	function calculateRadius(centerPoint, edgePoint) {
		return Math.sqrt(Math.pow(edgePoint.y - centerPoint.y, 2)
				+ Math.pow(edgePoint.z - centerPoint.z, 2)
				+ Math.pow(edgePoint.x - centerPoint.x, 2));
	}
	
	function randomness(currentIncrement, currentRadius, maxRadius, numRadiusIncrements) {
		return (Math.random() * (maxRadius/currentRadius) * currentRadius);
	}
	
	
	function createPointOnSpiral(centerPoint, currentIncrement, currentRadius, maxRadius, numRadiusIncrements, angle, shiftHeight, maxHeightVariance) {
		var zOffset = shiftHeight ? (2 * Math.random() - .5) * maxHeightVariance : 0;
		var y = centerPoint.y + (randomness(currentIncrement, currentRadius, maxRadius, numRadiusIncrements)) * Math.cos(angle);
		var z = centerPoint.z + (randomness(currentIncrement, currentRadius, maxRadius, numRadiusIncrements)) * Math.sin(angle);
		var x = centerPoint.x + zOffset;
				
		return {
			x: x,
			y: y,
			z: z
		};
	}
	
	function createSpiralPoints(vertices, centerPoint, maxRadius, numRadiusIncrements, angleIncrement, offset, shiftHeight, maxHeightVariance){
		for (var currentIncrement = 0; currentIncrement < numRadiusIncrements; currentIncrement++) {
			var angle = (currentIncrement * angleIncrement + offset),
					currentRadius = maxRadius * currentIncrement / numRadiusIncrements;
			
			if (currentRadius/maxRadius > .6) {
				var point = createPointOnSpiral(centerPoint, currentIncrement, currentRadius, maxRadius, numRadiusIncrements, angle, shiftHeight, maxHeightVariance);
				vertices.push(point);
			}
		}
	}
	
	var vertices = [];
	var radius = calculateRadius(centerPoint, edgePoint);
	var NO_SHIFT_HEIGHT = false;
	var SHIFT_HEIGHT = true;
	var heightIncrements =  height / numHeightSteps;
	
	for (var spiral = 0; spiral < numSpirals; spiral++) {
		createSpiralPoints(vertices, centerPoint, radius, radiusIncrement, angleIncrement, spiral * Math.random() * 2 * Math.PI, NO_SHIFT_HEIGHT);
	}
	
	for (var currentHeight = 1; currentHeight < numHeightSteps-1; currentHeight++) {
		var startingPoint = {
			y: centerPoint.y,
			z: centerPoint.z,
			x: centerPoint.x + currentHeight * heightIncrements
		};
		
		for (var spiral = 0; spiral < numSpirals; spiral++) {
			createSpiralPoints(vertices, startingPoint, radius, radiusIncrement, angleIncrement, spiral * Math.random() * 2 * Math.PI, SHIFT_HEIGHT, heightIncrements);
		}
	}
	
	var endpointPoint = {
		y: centerPoint.y,
		z: centerPoint.z,
		x: centerPoint.x + height
	};
	
	for (var spiral = 0; spiral < numSpirals; spiral++) {
		createSpiralPoints(vertices, endpointPoint, radius, radiusIncrement, angleIncrement, spiral * Math.random() * 2 * Math.PI, NO_SHIFT_HEIGHT);
	}
	
	return vertices;
}


function generatePlantedForest(xPosition, maxWidth, numWidthIncrement, maxRadius, minRadius, numRadiusIncrements) {
	
	function calculateRandomAngleInArc(minArcLength, maxArcLength, radius) {
		var circumference = 2 * Math.PI * radius;
		var startingAngle = 2 * Math.PI * minArcLength / circumference;
		var endingAngle = 2 * Math.PI * maxArcLength / circumference;
		
		return .3 * Math.random() * (endingAngle - startingAngle) + startingAngle;
	}
	
	function generateRandomPointOnArc(currentRadius, minArcLength, maxArcLength, arcRadius) {
		var angle = calculateRandomAngleInArc(minArcLength, maxArcLength, arcRadius);
		
		return {
			y: currentRadius * Math.sin(angle),
			z: currentRadius * Math.cos(angle)
		};
	}
	
	function generatePoint(leftWidthBoundary, widthOffset, currentMinArc, currentMaxArc, minRadius, maxRadius, widthVariance) {
		var x, y, z;
		var radius = minRadius + (maxRadius - minRadius) * Math.random();
		
		var pointOnArc = generateRandomPointOnArc(radius, currentMinArc, currentMaxArc, minRadius);
		
		x = (widthVariance ? widthOffset * .3 * Math.random() : 0)+ leftWidthBoundary;
		y = pointOnArc.y;
		z = pointOnArc.z;
		return {x: x, y: y, z: z};
	}
	
	function generateRing(leftWidthBoundary, widthOffset, minRadius, maxRadius, widthVariance) {
		var numMinArcSteps = Math.ceil((minRadius * 2 * Math.PI) / (widthOffset));
		var minArcIncrement = (minRadius * 2 * Math.PI) / numMinArcSteps;
		
		var vertices = [];
		
		for (var currentArcIncrement = 0; currentArcIncrement < numMinArcSteps; currentArcIncrement++) {
			var currentMinArc = currentArcIncrement * minArcIncrement;
			var currentMaxArc = currentMinArc + minArcIncrement ;
			
			vertices.push(generatePoint(leftWidthBoundary, widthOffset, currentMinArc, currentMaxArc, minRadius, maxRadius, widthVariance));
		}
		return vertices;
	}
	
	function generateDisk(leftWidthBoundary, widthOffset, maxRadius, minRadius, numRadiusIncrements, widthVariance) {
		var radiusIncrement = (maxRadius - minRadius)/ numRadiusIncrements;
		var vertices = [];
		
		//Generate points on inner diameter
		vertices = vertices.concat(generateRing(leftWidthBoundary, widthOffset, minRadius, minRadius, widthVariance));
		
		// Generate points inside ring
		for(var currentRadius = minRadius; currentRadius < maxRadius; currentRadius += radiusIncrement) {
			vertices = vertices.concat(generateRing(leftWidthBoundary, widthOffset, currentRadius, currentRadius + radiusIncrement, widthVariance));
		}
		//Generate points on outer diameter
		vertices = vertices.concat(generateRing(leftWidthBoundary, widthOffset, maxRadius, maxRadius, widthVariance));
		
		return vertices;
	}
	
	var widthIncrement = maxWidth / numWidthIncrement;
	var endWith = xPosition + maxWidth;
	
	var vertices = [];
	
	vertices = vertices.concat(generateDisk(xPosition, widthIncrement, maxRadius, minRadius, numRadiusIncrements, false));
	
	for(var currentXPosition = xPosition; currentXPosition < endWith; currentXPosition += widthIncrement) {
		vertices = vertices.concat(generateDisk(currentXPosition, widthIncrement, maxRadius, minRadius, numRadiusIncrements, true));
	}
	
	vertices = vertices.concat(generateDisk(endWith, widthIncrement, maxRadius, minRadius, numRadiusIncrements, false));
	return vertices;
}


function generateRandom(count) {
	var points = [];
	var pos = {
		x: 0,
		y: 0,
		z: 0
	};
	
	for (var i = 0; i < count; i++) {
		pos = {
			x: minMaxRand(-75, 75),
			y: minMaxRand(-150, 150),
			z: minMaxRand(-150, 150)
		};
		
		points.push(pos);
	}
	return points
}

function angleLetter(pos) {
	return Math.atan2(pos.z, pos.y) + 3 * Math.PI/2 ;
};


function createMaterial (color) {
	var color = new THREE.Color(color); //0x006600;
	// console.log(perc, color);

	return new THREE.MeshBasicMaterial({
		color: color,
		transparent: true,
		side: THREE.DoubleSide

// None of the options below significantly improved rendering performance		
//		reflectivity: 0,
//		depthWrite: false,
//		depthTest: false,
//		refractionRatio: 1, 
//		aoMapIntensity: 0, // oclussion effect
//		precision: 'lowp' // highp", "mediump" or "lowp"
//		opacity:  //Math.round(minMaxRand(0.3, 1) * 10).toFixed(2) 
		// ,side: THREE.DoubleSide
	});

/*
	return new THREE.ShaderMaterial({
		uniforms: {
			color: { type: 'v3', value: new THREE.Color(color) }
		},
		vertexShader: 'attribute vec3 vert;\n'
				+ 'void main() {\n'
				+ '  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n'
				+ '}',
		fragmentShader: 'uniform vec3 color;\n'
				+ 'void main() {\n'
				+ '  gl_FragColor = vec4(color,1);\n'
				+ '}'
	});
*/
}


function drawLetters(scene) {
	var loader = new THREE.FontLoader();
	
	loader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', function generateFontForrest(font) {
		// var count = 22500;
		// var count = 9000;
		// var points = generateRandom(count);
		
		// var centerPoint = {x: -75, y: 0, z: 0};
		// var edgePoint = {x: -75, y: 150, z: 150};
		// var height = 150;
		// var heightIncrements = 100;
		// var density = .3;
		// var points = generateCylinder(centerPoint, edgePoint, density, height, heightIncrements);
		
		var xPosition = -45; // 20
		var maxWidth = 90; // 30
		var numWidthIncrement = 40; // 15
		var maxRadius = 50; // 47
		var minRadius = 30; // 46
		var numRadiusIncrements = 5; // .2
		var fontSize = .4;
		var points = generatePlantedForest(xPosition, maxWidth, numWidthIncrement, maxRadius, minRadius, numRadiusIncrements);
		
		console.log('Total objects in universe:', points.length);
		var midway = maxWidth/2 + xPosition;

		var leftMat = createMaterial(0xFF7722),
			centerMat = createMaterial(0x444444),
			rightMat = createMaterial(0x2277FF);

		// noinspection BadExpressionStatementJS

		var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
		
		var fontShapes = [];
		for (let i = 0; possible.length > i; i++) {
			let geometry = new THREE.ShapeBufferGeometry(font.generateShapes(possible[i], fontSize));
			// make shape ( N.B. edge view not visible )
			geometry.computeBoundingBox();
			geometry.translate(-0.5 * (geometry.boundingBox.max.x - geometry.boundingBox.min.x), 0, 0);
			fontShapes[i] = geometry;
		}

		points.forEach((pos) => {
			let curMat;
			if (pos.x < midway - 15){
				curMat = leftMat;
			} else if (pos.x > midway + 15) {
				curMat = rightMat;
			} else {
				curMat = centerMat;
			}

			let letterPos = Math.floor(Math.random() * possible.length);

			let mesh = new THREE.Mesh(fontShapes[letterPos], curMat);
			mesh.position.x = pos.x;
			mesh.position.y = pos.y;
			mesh.position.z = pos.z;
			
			mesh.rotation.x = angleLetter(mesh.position);

//			mesh.visible = false;

			// do update after properties are set as part of startup process
			mesh.updateMatrix();
			
			// don't auto update every frame for this mesh
			mesh.matrixAutoUpdate = false;
			
			// try to save some cycles in calculating what to show and hide by doing this ourselves using in view mesh buckets
			// mesh.frustumCulled = false; // this worked horribly. Double the render object calls. 

			scene.add(mesh);
			assignToBucket(mesh);

		});

	}); //end load function
	
}

init();

onWinResize();

render();
requestAnimationFrame(animate);

document.body.addEventListener('mousemove', onMouseMove);
window.addEventListener('resize', onWinResize);
