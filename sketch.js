let midi;
let midioutput = null;
let midi_is = false;
let Matrix = [];
let MatrixMods = [];
let SecondarySources = [];
let marked_mod_entry = 0;
let interval;
let midi_selection;
let midi_channel_selection;
let midi_channel = 1

/*
MIDI STUFF
*/
let midi_possibilities = {};
let midi_names = [];


function onMIDISuccess( midiAccess ) {
  midi = midiAccess;
  for (var entry of midi.outputs) {
    console.log(entry);
    midi_possibilities[entry[1].name] = entry[0];
    midi_names.push(entry[1].name)
    midioutput = entry[1];
  }
  console.log( "MIDI ready!" , midioutput);
  midi_is = true;
  midi_selection = createSelect()
  midi_selection.parent("canvas");
  midi_selection.position(width-150, height-150);
  for (let j = 0; j<midi_names.length; j++) {
    midi_selection.option(midi_names[j]);
  }
  midi_selection.changed(choose_midi);

  midi_channel_selection = createSelect()
  midi_channel_selection.parent("canvas");
  midi_channel_selection.position(width-150, height-100);
  for (let j = 1; j<17; j++) {
    midi_channel_selection.option("Channel "+ j);
  }
  midi_channel_selection.changed(()=>{
    let midi_channel_string = midi_channel_selection.value();
    midi_channel = parseInt(midi_channel_string.slice(-1));
  })
}

function choose_midi() {
  let name_id = midi_possibilities[midi_selection.value()];
  midioutput = midi.outputs.get(name_id)
  console.log( "MIDI ready!" , midioutput);
  midi_is = true;
}

function onMIDIFailure(msg) {
  console.log( "Failed to get MIDI access - " + msg );
}

var startMidi = function() {
  navigator.requestMIDIAccess().then( onMIDISuccess, onMIDIFailure );
  document.removeEventListener("click", startMidi);
};

document.addEventListener("click", startMidi);

/*
MATRIX STUFF
*/

source_names = [
  "Direct",
  "ModWheel",
  "AftTouch",
  "ExprPED1",
  "BrthPED2",
  "Velocity",
  "Keyboard",
  "Lfo1+",
  "Lfo1+/-",
  "Lfo2+",
  "Lfo2+/-",
  "AmpEnv",
  "ModEnv1",
  "ModEnv2",
  "Animate1",
  "Animate2",
  "CV +/-",
  "Lfo3+",
  "Lfo3+/-",
  "Lfo4+",
  "Lfo4+/-",
  "BndWhl+",
  "BenWhl-"
]

destination_names = [
  "O123Ptch",
  "Osc1Ptch",
  "Osc2Ptch",
  "Osc3Ptch",
  "Osc1VSnc",
  "Osc2VSnc",
  "Osc3VSnc",
  "Osc1Shpe",
  "Osc2Shpe",
  "Osc3Shpe",
  "Osc1 Lev",
  "Osc2 Lev",
  "Osc3 Lev",
  "NoiseLev",
  "Ring Lev",
  "VcaLevel",
  "Filt Drv",
  "FiltDist",
  "FiltFreq",
  "Filt Res",
  "Lfo1Rate",
  "Lfo2Rate",
  "AmpEnv A",
  "AmpEnv D",
  "AmpEnv R",
  "ModEnv1A",
  "ModEnv1D",
  "ModEnv1R",

];

function send_messages(a,b,c) {
  // value
  let cc = 175 + midi_channel;
  midioutput.send( [cc, 0x63, a] ); 
  midioutput.send( [cc, 0x62, b] ); 
  midioutput.send( [cc, 0x06, c] ); 
  //midioutput.send( [0xB0, 0x26, 0] ); 
}



function proper_modulo(input, mod_val) {
  if (input >= 0) {
    return input % mod_val
  }
  else {
    return (input + (Math.ceil(-1*input/mod_val)*mod_val)) % mod_val
  }
}


class ColumnEntry {
  constructor(z) { 
    this.z = z; // mod number 1..16
    this.x = destination_names.length*25+ 50; 
    this.compute_position(z);
    this.in_val = 0;
    this.secondary_in_val = 0;
    this.out_val = 0;
    this.depth = 64;
    let from = color(255,104,12)//color(218, 165, 32);
    let to = color(12,10,150)//color(72, 61, 139);
    this.color = lerpColor(from, to, (z-1)/15);
    this.marked = false;

   }

  compute_position(y) {
    this.y = (y-1)*25+2.5;
  } 

  send_message() {
    // set mod matrix entry
    send_messages(0,125,this.z-1)
    // source 1
    send_messages(this.z, 0, this.in_val)
    // source 2
    send_messages(this.z, 1, this.secondary_in_val)
    // depth
    send_messages(this.z, 2, this.depth)
    // destination
    send_messages(this.z, 3, this.out_val)
  }

  display() {
    if (this.marked) {
      strokeWeight(3);
    }
    else {
      strokeWeight(1);
    }
    fill(this.color)
    rect(this.x, this.y, 20)

    fill(250);
    rect(this.x+25,this.y, 150, 20)
    fill(this.color);


    rect(this.x+100,this.y+3, (this.depth-64)*75/65,14)
  }

  change_depth(val) {
    this.depth = proper_modulo(this.depth + val,128);
  }
  change_source1(val) {
    this.in_val = proper_modulo(this.in_val + val,source_names.length);
  }
  change_source2(val) {
    this.secondary_in_val = proper_modulo(this.secondary_in_val + val,source_names.length);
  }
  change_destination(val) {
    this.out_val = proper_modulo(this.out_val + val,destination_names.length);
  }


  activate() {
    this.marked = true
    SecondarySources[this.secondary_in_val].used_color = this.color;
    SecondarySources[this.secondary_in_val].marked = true;
    let matrix_entry = Matrix[this.in_val][this.out_val]
    matrix_entry.color = this.color;
    matrix_entry.marked =  true;
    matrix_entry.mod_ref =  this.z;
    if (midioutput) {
      this.send_message();
    }
    
  }
  rebase() {
    this.marked = false;
    let matrix_entry = Matrix[this.in_val][this.out_val]
    matrix_entry.color = this.color;
    matrix_entry.marked =  false;
    matrix_entry.mod_ref =  this.z;
    
    

  }




}


class SecondarySource {
  constructor(z) { 
    this.z = z; // source no 0..15
    this.x = (destination_names.length+1)*25; 
    this.compute_position(z);
    this.used_color = color(255,9,56);
    this.unused_color = color(250);
    this.marked = false
   }

  compute_position(y) {
    this.y = (y)*25+2.5;
  } 

  display() {
    if (this.marked) {
      fill(this.used_color)
      strokeWeight(3);
    }
    else {
      fill(this.unused_color)
      strokeWeight(1);
    }
    rect(this.x, this.y, 20)
  }

  rebase() {
    this.marked = false
  }

}




class MatrixEntry {
  constructor(x,y) { 
    this.x = 0;
    this.y = 0;
    this.compute_position(x,y);
    this.in_val = y;
    this.out_val = x;
    this.marked = false;
    this.color = color(250);
    this.mod_ref = null;
    
   }

  compute_position(x,y) {
    this.y = y*25+2.5;
    this.x = x*25+2.5;
  }

  display() {
    if (this.marked) {
      strokeWeight(3);
      let extra = -60;
      line(this.x+20, extra, this.x+20, this.y)
      line(extra, this.y+20, this.x, this.y+20)
      line(this.x, extra, this.x, this.y)
      line(extra, this.y, this.x, this.y)
    }
    else {
      strokeWeight(1);
    }
    fill(this.color)
    rect(this.x, this.y, 20)
  }
  /*check_position(x,y, col, mark) {
    if (this.in_val == y && this.out_val == x) {
      this.marked = mark;
      this.color = col;
    }
  }*/
  rebase() {
    this.color = color(250);
    this.marked = false;
    this.mod_ref = null;
  }

}


/*
SKETCH STUFF
*/

function setup() {
  let canvas = createCanvas(100+(destination_names.length+3)*25+155,100+ source_names.length*25);
  
  canvas.parent("canvas")
  select('#canvas_container').style("margin-left", "-"+(width/2).toString()+"px");
  

  for (let i = 0; i<source_names.length; i++) {
    let local_row = []
    for (let j = 0; j<destination_names.length; j++) {
      local_row.push(new MatrixEntry(j, i))
    }
    Matrix.push(local_row);
  }
  for (let i = 0; i<16; i++) {
      MatrixMods.push(new ColumnEntry(i+1))
  }
  for (let i = 0; i<source_names.length; i++) {
    SecondarySources.push(new SecondarySource(i))
  }
  noLoop();
 
}







function draw() {
  background(220);
  stroke(0)
  fill(0)
  textAlign(RIGHT);
  for(var i = 0; i < source_names.length; i++){
    

    text(source_names[i],100,118+i*25);
  }
  textAlign(LEFT);

  translate(100,100)
  rotate(3*HALF_PI)
  for(var i = 0; i < destination_names.length; i++){
    text(destination_names[i],0,18+i*25);
  }
  text("2nd Source", 0, 18+(destination_names.length+1)*25)
  text("MOD Slot", 0, 18+(destination_names.length+2)*25)
  text("DEPTH", 0, 16+(destination_names.length+5.5)*25)

  rotate(HALF_PI);
  stroke(0);
  fill(250)
  for(var i = 0; i < Matrix.length; i++){
    for(var j = 0; j < Matrix[i].length; j++){
    Matrix[i][j].display();
    }
  }
  for(var i = 0; i < MatrixMods.length; i++){
    MatrixMods[i].display();
  }
  for(var i = 0; i < SecondarySources.length; i++){
    SecondarySources[i].display();
  }
}












/*
CONTROL STUFF
*/

function keyTyped() {
  if (keyIsDown(81)) { // q
    if (keyCode === 75) { // k
      MatrixMods[marked_mod_entry].change_destination(-1)
    } else if (keyCode === 186) { // ö
      MatrixMods[marked_mod_entry].change_destination(1)
    } else if (keyCode === 79) { // o
      MatrixMods[marked_mod_entry].change_source1(-1)
    } else if (keyCode === 76) { // l
      MatrixMods[marked_mod_entry].change_source1(1)
    }
  }
  else if (keyIsDown(87)) { // w
    if (keyCode === 75) { // k
      MatrixMods[marked_mod_entry].change_destination(-5)
    } else if (keyCode === 186) { // ö
      MatrixMods[marked_mod_entry].change_destination(5)
    } else if (keyCode === 79) { // o
      MatrixMods[marked_mod_entry].change_source1(-5)
    } else if (keyCode === 76) { // l
      MatrixMods[marked_mod_entry].change_source1(5)
    }
  }
  else if (keyIsDown(69)) { // e
    if (keyCode === 75) { // k
      MatrixMods[marked_mod_entry].change_depth(-1)
    } else if (keyCode === 186) { // ö
      MatrixMods[marked_mod_entry].change_depth(1)
    } else if (keyCode === 79) { // o
      MatrixMods[marked_mod_entry].change_source2(-1)
    } else if (keyCode === 76) { // l
      MatrixMods[marked_mod_entry].change_source2(1)
    }
  }

  else if (keyIsDown(69)) { // e
    if (keyCode === 75) { // k
      MatrixMods[marked_mod_entry].change_depth(-10)
    } else if (keyCode === 186) { // ö
      MatrixMods[marked_mod_entry].change_depth(10)
    } else if (keyCode === 79) { // o
      MatrixMods[marked_mod_entry].change_source2(-5)
    } else if (keyCode === 76) { // l
      MatrixMods[marked_mod_entry].change_source2(5)
    }
  }
  else  { // r
    
    if (keyCode === 79) { // o
      marked_mod_entry = proper_modulo(marked_mod_entry-1,16);
    } else if (keyCode === 76) { // l
      marked_mod_entry = proper_modulo(marked_mod_entry+1,16);
    }
  }
  
  
  /* 
  1. rebase the grid (all unmarked, uncolored)
  2. rebase the seconds (all uncolored)
  3. rebase the mods (all unmarked, color grid positions in sequence, even if overlay)
  4. find & activate mod (color and mark gird, color second, send midi)
  */
  cleanredraw()

}




function mousePressed() {
  //console.log(mouseX, mouseY)
  let init_x = mouseX;
  let dist = 0;
  let x = mouseX - 100;
  let y = mouseY - 100;


  if (x>=0 && x <=25*destination_names.length && y>= 0 && y <= 25*source_names.length) {

    let new_in = Math.floor(y/25);
    let new_out = Math.floor(x/25);
    if (mouseButton === RIGHT) {
      let matrix_entry = Matrix[new_in][new_out]
      if (matrix_entry.mod_ref) {
        marked_mod_entry = matrix_entry.mod_ref-1;
      }
    }
    else {
      MatrixMods[marked_mod_entry].in_val = new_in;
      MatrixMods[marked_mod_entry].out_val = new_out;
    }
    
  }
  else if (x>=25*(destination_names.length+1) && x <=25*(destination_names.length+2) && y>= 0 && y <= 25*source_names.length) {
    let new_in2 = Math.floor(y/25);
    MatrixMods[marked_mod_entry].secondary_in_val = new_in2;
  }
  else if (x>=25*(destination_names.length+2) && x <=25*(destination_names.length+8) && y>= 0 && y <= 25*16) {
    let new_marked_mod = Math.floor(y/25);
    marked_mod_entry = new_marked_mod;
    if (mouseIsPressed) {
      interval = setInterval(() => {  
        dist = mouseX-init_x;
        // console.log("distance is "+dist)
        MatrixMods[marked_mod_entry].change_depth(dist);
        init_x = mouseX;
        cleanredraw()

       }, 50);
      
    }
    
  }


}

function mouseReleased() {

    clearInterval(interval);
    cleanredraw()
  }

function cleanredraw() {
  for(var i = 0; i < Matrix.length; i++){
    for(var j = 0; j < Matrix[i].length; j++){
    Matrix[i][j].rebase();
    }
  }
  for(var i = 0; i < SecondarySources.length; i++){
    SecondarySources[i].rebase();
  }
  for (let i = 0; i<16; i++) {
    MatrixMods[i].rebase()
  }
  MatrixMods[marked_mod_entry].activate()

  redraw();
}
