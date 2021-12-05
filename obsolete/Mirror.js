
function mirror(p, t, concave){
	var objectDistance = p;

	// Concave mirrors have positive focal length, convex have negative
	var focalLength = concave ? t : -t;
	var radiusOfCurvature = 2 * focalLength;

	// Derive image distance formula from 1/f = 1/v + 1/u
	// 1/focalLength = 1/objectDistance + 1/imageDistance
	// 1/imageDistance = 1/focalLength - 1/objectDistance
	var imageDistance = 1/(1/focalLength - 1/objectDistance);

	// Calculate mangification
	var magnification = -(imageDistance / objectDistance);

	// The image is real, inverted, and on the same side only if the mirror is concave
	// and the object is more than a focal length away

	var imageIsReal = concave && (objectDistance > focalLength);
	var imageIsInverted = concave && (objectDistance > focalLength);
	var imageIsSameSide = concave && (objectDistance > focalLength);

	console.log("A mirror of p="+p+" and t="+focalLength +
				"   Radius: " + radiusOfCurvature, "imageDistance: " + imageDistance,
				"Magnification: " + magnification, "Real = Inverted = sameSide: " + imageIsReal);
}

// Run calculations
mirror(15, 10, true);
mirror(24, 36, true);
mirror(22, 35, false);
mirror(17, 14, false);