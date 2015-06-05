/*
 * This is a JavaScript Scratchpad.
 *
 * Enter some JavaScript, then Right Click or choose from the Execute Menu:
 * 1. Run to evaluate the selected text (Cmd-R),
 * 2. Inspect to bring up an Object Inspector on the result (Cmd-I), or,
 * 3. Display to insert the result in a comment after the selection. (Cmd-L)
 */
var positions = [];
var positionMin = 1;
var positionMax = 15;

var x = {min: -1, max: 1};
var y = {min: -1, max: 1};

function random(min, max) {
  const range = max - min;
  return min + range * Math.random();
}

for(let p = positionMin, i = 0; p <= positionMax; ++p, ++i) {
  positions[i] = [p.toString(), [random(x.min, x.max), random(y.min, y.max)] ];
}

var j = JSON.stringify(positions);


j;

/*
[["1",[0.10221219438102258,-0.38782823154201695]],["2",[-0.1253997655173662,-0.14731720721966068]],["3",[-0.7448839071366271,-0.15423641727326043]],["4",[0.34808970426766295,0.18959214993926032]],["5",[0.39743824157430074,0.5041891124312587]],["6",[-0.9344276685857305,0.3852387236927701]],["7",[0.5029353562006951,-0.9189346696246912]],["8",[-0.1854747580406655,-0.1833602320989971]],["9",[0.048617374530626645,-0.5296420003224569]],["10",[-0.4889246321523588,0.6303868653479148]],["11",[0.8136862899789272,0.5133124145564925]],["12",[-0.8542865353438278,0.4456064112745053]],["13",[0.6444039671267046,0.7462530239241334]],["14",[0.043844667013648086,-0.9038017166514407]],["15",[0.8949110681867802,0.5578084643368548]]]
