// by Tim Knapen, based upon gears http://joostn.github.io/OpenJsCad/gearsdemo.html

// Here we define the user editable parameters:
function getParameterDefinitions() {
	return [
			{ name: 'parts', caption: 'Rack and/or gear. 1 = Rack, 2 = Gear, 3 = both. ', type: 'int', default: 3 },
			
			{ name: 'numTeeth', caption: 'Rack number of teeth:', type: 'int', default: 5 },
			{ name: 'thickness', caption: 'Rack Thickness:', type: 'float', default: 5 },
			{ name: 'rack_clearance', caption: 'Rack Clearance:', type: 'float', default: 0 },
			
			{ name: 'gear_numTeeth', caption: 'Gear number of teeth:', type: 'int', default: 9 },
			{ name: 'gear_thickness', caption: 'Gear Thickness:', type: 'float', default: 5 },
			{ name: 'gear_hole_diam', caption: 'Gear hole diameter (0 for no hole):', type: 'float', default: 5 },
			{ name: 'gear_clearance', caption: 'Gear Clearance:', type: 'float', default: 0 },
			
			{ name: 'circularPitch', caption: 'Circular pitch:', type: 'float', default: 8 },
			{ name: 'pressureAngle', caption: 'Pressure angle:', type: 'float', default: 20 },
			
			];
}

// Main entry point; here we construct our solid:
function main(params)
{
	var rack = involuteRack(
							params.numTeeth,
							params.circularPitch,
							params.pressureAngle,
							params.rack_clearance,
							params.thickness
							);
	if(params.parts == 1){
		return rack;
	}
	
	var gear = involuteGear(
							params.gear_numTeeth,
							params.circularPitch,
							params.pressureAngle,
							params.gear_clearance,
							params.gear_thickness
							);
	
	if(params.gear_hole_diam > 0)
	{
		var centerhole = CSG.cylinder({start: [0,0,-params.gear_thickness], end: [0,0,params.gear_thickness], radius: params.gear_hole_diam/2, resolution: 16});
		gear = gear.subtract(centerhole);
	}
	if(params.parts == 2){
		return gear;
	}
	var gear_outer_radius = params.gear_numTeeth * params.circularPitch / (2 * Math.PI);
	var rack_height = baseWidth = 3 * ( params.rack_clearance + params.circularPitch / Math.PI ) + 2*params.circularPitch / Math.PI;
	gear = gear.translate([ 5 + rack_height + gear_outer_radius , 0, 0]);
	var result = rack.union(gear);
	
	return result;
}

/*
 For gear terminology see:
 http://www.astronomiainumbria.org/advanced_internet_files/meccanica/easyweb.easynet.co.uk/_chrish/geardata.htm
 Algorithm based on:
 http://www.cartertools.com/involute.html
 
 circularPitch: The distance between adjacent teeth measured at the pitch circle
 */
function involuteRack(numTeeth, circularPitch, pressureAngle, clearance, thickness)
{
	// default values:
	if(arguments.length < 3) pressureAngle = 20;
	if(arguments.length < 4) clearance = 0;
	if(arguments.length < 4) thickness = 1;
	
	var addendum = circularPitch / Math.PI;
	var dedendum = addendum + clearance;
	
	var baseWidth = 3*dedendum;
	var rootWidth = 2*dedendum;
	
	// build teeth in the 'points' array:
	var points = []; // 0,0
	var pt;
	
	//points.push(new CSG.Vector2D(0,0)); //
	
	
	for(var i = 0; i < numTeeth; i++){
		var xpos = i * circularPitch;
		pt = CSG.Vector2D.fromAngleDegrees(-pressureAngle).times(-dedendum);
		points.push(new CSG.Vector2D(baseWidth, xpos + 0).plus(pt));
		
		pt = CSG.Vector2D.fromAngleDegrees(pressureAngle).times(-dedendum);
		points.push(new CSG.Vector2D(baseWidth, xpos +circularPitch/2).plus(pt));
		
		pt = CSG.Vector2D.fromAngleDegrees(pressureAngle).times(addendum);
		points.push(new CSG.Vector2D(baseWidth, xpos +circularPitch/2).plus(pt));
		
		pt = CSG.Vector2D.fromAngleDegrees(-pressureAngle).times(addendum);
		points.push(new CSG.Vector2D(baseWidth, xpos +circularPitch).plus(pt));
		
	}
	
	
	
	pt = CSG.Vector2D.fromAngleDegrees(-pressureAngle).times(-dedendum);
	points.push(new CSG.Vector2D(baseWidth, numTeeth*circularPitch).plus(pt));
	points.push(new CSG.Vector2D(0, numTeeth*circularPitch));
	
	// and going back:
	for(var i = numTeeth - 1; i >= 0; i--){
		var xpos = i * circularPitch;
		points.push(new CSG.Vector2D(0, xpos + circularPitch/2));
		points.push(new CSG.Vector2D(0, xpos));
	}
	
	
	// create the polygon and extrude into 3D:
	var allteeth = new CSG.Polygon2D(points).extrude({offset: [0, 0, thickness]});
	
	var result = allteeth;
	
	// center at origin:
	// result = result.translate([0, -circularPitch*numTeeth/2,0]); // -thickness/2]);
	result = result.translate([0, -circularPitch/2, 0]);
	return result;
}


function involuteGear(numTeeth, circularPitch, pressureAngle, clearance, thickness)
{
	// default values:
	if(arguments.length < 3) pressureAngle = 20;
	if(arguments.length < 4) clearance = 0;
	if(arguments.length < 4) thickness = 1;
	
	var addendum = circularPitch / Math.PI;
	var dedendum = addendum + clearance;
	
	// radiuses of the 4 circles:
	var pitchRadius = numTeeth * circularPitch / (2 * Math.PI);
	var baseRadius = pitchRadius * Math.cos(Math.PI * pressureAngle / 180);
	var outerRadius = pitchRadius + addendum;
	var rootRadius = pitchRadius - dedendum;
	
	var maxtanlength = Math.sqrt(outerRadius*outerRadius - baseRadius*baseRadius);
	var maxangle = maxtanlength / baseRadius;
	
	var tl_at_pitchcircle = Math.sqrt(pitchRadius*pitchRadius - baseRadius*baseRadius);
	var angle_at_pitchcircle = tl_at_pitchcircle / baseRadius;
	var diffangle = angle_at_pitchcircle - Math.atan(angle_at_pitchcircle);
	var angularToothWidthAtBase = Math.PI / numTeeth + 2*diffangle;
	
	// build a single 2d tooth in the 'points' array:
	var resolution = 5;
	var points = [new CSG.Vector2D(0,0)];
	for(var i = 0; i <= resolution; i++)
	{
		// first side of the tooth:
		var angle = maxangle * i / resolution;
		var tanlength = angle * baseRadius;
		var radvector = CSG.Vector2D.fromAngle(angle);
		var tanvector = radvector.normal();
		var p = radvector.times(baseRadius).plus(tanvector.times(tanlength));
		points[i+1] = p;
		
		// opposite side of the tooth:
		radvector = CSG.Vector2D.fromAngle(angularToothWidthAtBase - angle);
		tanvector = radvector.normal().negated();
		p = radvector.times(baseRadius).plus(tanvector.times(tanlength));
		points[2 * resolution + 2 - i] = p;
	}
	
	// create the polygon and extrude into 3D:
	var tooth3d = new CSG.Polygon2D(points).extrude({offset: [0, 0, thickness]});
	
	var allteeth = new CSG();
	for(var i = 0; i < numTeeth; i++)
	{
		var angle = i*360/numTeeth;
		var rotatedtooth = tooth3d.rotateZ(angle);
		allteeth = allteeth.unionForNonIntersecting(rotatedtooth);
	}
	
	// build the root circle:
	points = [];
	var toothAngle = 2 * Math.PI / numTeeth;
	var toothCenterAngle = 0.5 * angularToothWidthAtBase;
	for(var i = 0; i < numTeeth; i++)
	{
		var angle = toothCenterAngle + i * toothAngle;
		var p = CSG.Vector2D.fromAngle(angle).times(rootRadius);
		points.push(p);
	}
	
	// create the polygon and extrude into 3D:
	var rootcircle = new CSG.Polygon2D(points).extrude({offset: [0, 0, thickness]});
	
	var result = rootcircle.union(allteeth);
	
	// center at origin:
	result = result.rotateZ((360/numTeeth)/4);
	//result = result.translate([0, 0, -thickness/2]);
	
	return result;
}