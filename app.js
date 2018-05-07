// set up SVG for D3
const width = 760,
  height = 550;
  let colors = d3.interpolateRainbow;

const svg = d3.select('#svgBox')
  .append('svg')
  .attr('oncontextmenu', 'return false;')
  .attr('width', 760)
  .attr('height', 550);

console.log(svg)

//Form variables declared here
const form = d3.select('form')
const formName = d3.select('#charName')
const formTitle = d3.select('#title')
const formLocation = d3.select('#location')
const formLinks = d3.select('#links')
const formColor = d3.select('#color')

// set up initial nodes and links
//  - reflexive edges are indicated on the node (as a bold black circle).
//  - links are always source < target; edge directions are set by 'left' and 'right'.
let nodes = [
  {
    id: 0,
    name: 'Ned Stark',
    title: 'Lord of Winterfell',
    nickname: 'The Quiet Wolf',
    location: 'Winterfell',
    reflexive: false
  }, {
    id: 1,
    name: 'Daenerys Targaryen',
    title: 'Queen of the Andals & First Men',
    nickname: 'Mother of Dragons',
    location: 'Dragonstone',
    reflexive: true
  }, {
    id: 2,
    name: 'Cersei Lannister',
    title: 'Queen of the Seven Kingdoms',
    nickname: 'Evil Queen',
    location: 'Casterly Rock',
    reflexive: false
  }],
  lastNodeId = 2,
  links = [
    { source: nodes[0], target: nodes[1], left: false, right: true, relationship: 'Family' },
    { source: nodes[2], target: nodes[0], left: false, right: true, relationship: 'Murder' }
  ];

// init D3 force layout
const force = d3.forceSimulation(nodes)
  .force("link", d3.forceLink(links).distance(150))
  .force("charge", d3.forceCollide().radius(5))
  .force("r", d3.forceRadial(function (d) { return d.type === "a" ? 100 : 200; }))
  .on('tick', tick)
  .force("y", d3.forceY(300))
  .force("x", d3.forceX(100))

// const force = d3.forceSimulation()
//   .force("link", d3.forceLink().id(function (d) { return d.index }))
//   .force("collide", d3.forceCollide(function (d) { return d.r + 8 }).iterations(16))
//   .force("charge", d3.forceManyBody())
//   .force("center", d3.forceCenter(width / 2, height / 2))
//   .force("y", d3.forceY(0))
//   .force("x", d3.forceX(0))

// define arrow markers for graph links
svg.append('svg:defs').append('svg:marker')
  .attr('id', 'end-arrow')
  .attr('viewBox', '0 -5 10 10')
  .attr('refX', 6)
  .attr('markerWidth', 3)
  .attr('markerHeight', 3)
  .attr('orient', 'auto')
  .append('svg:path')
  .attr('d', 'M0,-5L10,0L0,5')
  .attr('fill', '#8f8f8f');

svg.append('svg:defs').append('svg:marker')
  .attr('id', 'start-arrow')
  .attr('viewBox', '0 -5 10 10')
  .attr('refX', 4)
  .attr('markerWidth', 3)
  .attr('markerHeight', 3)
  .attr('orient', 'auto')
  .append('svg:path')
  .attr('d', 'M10,-5L0,0L10,5')
  .attr('fill', '#000');

// line displayed when dragging new nodes
let drag_line = svg.append('svg:path')
  .attr('class', 'link dragline hidden')
  .attr('d', 'M0,0L0,0');

// handles to link and node element groups
let path = svg.append('svg:g').selectAll('path'),
  circle = svg.append('svg:g').selectAll('g');

// mouse event vars
let selected_node = null,
    selected_link = null,
    mousedown_link = null,
    mousedown_node = null,
    mouseup_node = null;

function resetMouseVars() {
  mousedown_node = null;
  mouseup_node = null;
  mousedown_link = null;
}

// update force layout (called automatically each iteration)
function tick() {
  // draw directed edges with proper padding from node centers
  path.attr('d', function (d) {
    let deltaX = d.target.x - d.source.x,
      deltaY = d.target.y - d.source.y,
      dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY),
      normX = deltaX / dist,
      normY = deltaY / dist,
      sourcePadding = d.left ? 17 : 12,
      targetPadding = d.right ? 17 : 12,
      sourceX = d.source.x + (sourcePadding * normX),
      sourceY = d.source.y + (sourcePadding * normY),
      targetX = d.target.x - (targetPadding * normX),
      targetY = d.target.y - (targetPadding * normY);
    return 'M' + sourceX + ',' + sourceY + 'L' + targetX + ',' + targetY;
  });

  circle.attr('transform', function (d) {
    return 'translate(' + d.x + ',' + d.y + ')';
  });
}

// update graph (called when needed)
function restart() {
  let showForm = false;
  // path (link) group
  path = path.data(links);

  // update existing links
  path.classed('selected', function (d) { return d === selected_link; })
    .style('marker-start', function (d) { return d.left ? 'url(#start-arrow)' : ''; })
    .style('marker-end', function (d) { return d.right ? 'url(#end-arrow)' : ''; });


  // add new links
  path.enter().append('svg:path')
    .attr('class', 'link')
    .classed('selected', function (d) { return d === selected_link; })
    .style('marker-start', function (d) { return d.left ? 'url(#start-arrow)' : ''; })
    .style('marker-end', function (d) { return d.right ? 'url(#end-arrow)' : ''; })
    .on('mousedown', function (d) {
      // select link
      mousedown_link = d;
      if (mousedown_link === selected_link) selected_link = null;
      else selected_link = mousedown_link;
      selected_node = null;
      restart();
    });
  // remove old links
  path.exit().remove();


  // circle (node) group
  // NB: the function arg is crucial here! nodes are known by id, not by index!
  circle = circle.data(nodes, function (d) { return d.id; });

  //helper function to brighten custom colors
  function ColorLuminance(hex, lum) {

    // validate hex string
    hex = String(hex).replace(/[^0-9a-f]/gi, '');
    if (hex.length < 6) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    lum = lum || 0;

    // convert to decimal and change luminosity
    var rgb = "#", c, i;
    for (i = 0; i < 3; i++) {
      c = parseInt(hex.substr(i * 2, 2), 16);
      c = Math.round(Math.min(Math.max(0, c + (c * lum)), 255)).toString(16);
      rgb += ("00" + c).substr(c.length);
    }

    return rgb;
  }

  // update existing nodes (reflexive & selected visual states)
  circle.selectAll('circle')
    .style('fill', function (d) {
      console.log(d)
      if (d.color) {
        return (d === selected_node) ? ColorLuminance(d.color, 0.4) : d.color;
      } else {
        return (d === selected_node) ? d3.rgb(colors(d.id))
          .brighter().toString() : colors(d.id);
      }
    })
    .classed('reflexive', function (d) { return d.reflexive; });

  // add new nodes
  let g = circle.enter().append('svg:g');
  g.append('svg:circle')
    .attr('class', 'node')
    .attr('r', 12)
    .style('fill', function (d) {
      return (d === selected_node) ? d3.rgb(colors(d.id)).brighter().toString() : colors(d.id);
    })
    .classed('reflexive', function (d) { return d.reflexive; })
    .on('mouseover', function (d) {
      if (!mousedown_node || d === mousedown_node) return;
      // enlarge target node
      d3.select(this).attr('transform', 'scale(1.1)');
    })
    .on('mouseout', function (d) {
      if (!mousedown_node || d === mousedown_node) return;
      // unenlarge target node
      d3.select(this).attr('transform', '');
    })
    .on('mousedown', function (d) {
      showForm = !showForm;

      if (d3.event.ctrlKey) return;

      // select node
      mousedown_node = d;
      if (mousedown_node === selected_node) selected_node = null;
      else selected_node = mousedown_node;
      selected_link = null;

      // reposition drag line
      drag_line
        .style('marker-end', 'url(#end-arrow)')
        .classed('hidden', false)
        .attr('d', 'M' + mousedown_node.x + ',' + mousedown_node.y + 'L' + mousedown_node.x + ',' + mousedown_node.y);

      restart();
    })
    .on('mouseup', function (d) {
      if (!mousedown_node) return;

      // needed by FF
      drag_line
        .classed('hidden', true)
        .style('marker-end', '');

      // check for drag-to-self
      mouseup_node = d;
      if (mouseup_node === mousedown_node) { resetMouseVars(); return; }

      // unenlarge target node
      d3.select(this).attr('transform', '');

      // add link to graph (update if exists)
      let source, target, direction;
        source = mousedown_node;
        target = mouseup_node;
        direction = 'right';

      let link;
      link = links.filter(function (l) {
        return (l.source === source && l.target === target);
      })[0];

      if (link) {
        link[direction] = true;
      } else {
        link = { source: source, target: target, left: false, right: false };
        link[direction] = true;
        links.push(link);
      }

      // select new link
      selected_link = link;
      selected_node = null;
      restart();
    });

  // show node IDs
  g.append('svg:text')
    .attr('x', 20)
    .attr('y', 5)
    .attr('class', 'id')
    .text(function (d) {
      return d.name;
    });

  // remove old nodes
  circle.exit().remove();

  // set the graph in motion
  // force.start();
}

//Our form button submit
function formUpdate(event) {
  //update the data on the selected node based on the form input
  let nodeId = selected_node.id;
  nodes[nodeId].name = formName.property('value');
  nodes[nodeId].title = formTitle.property('value');
  nodes[nodeId].location = formLocation.property('value');
  nodes[nodeId].color = formColor.property('value');

  //filter by id to find the correct circle
  let allCircles = circle.enter()
  let selectedCircle = allCircles[0].update.filter(ourCircle => (ourCircle.__data__.id === nodeId))

  //change color based on form data
  let innerCircle = d3.select(selectedCircle[0].firstChild)
  d3.select(innerCircle[0][0]).style('fill', formColor.property('value'))

  //grab the child text element and add new text from form to circle
  let innerText = selectedCircle[0].lastChild

  d3.select(innerText)
    .text(function(d){
      return d.name
  })
}

function mousedown() {
  // because :active only works in WebKit?
  svg.classed('active', true);

  //helper function to remove relationship elements from display
  function clearLinks(){
    let allLinks = document.getElementById('links')
    while (allLinks.firstChild) {
      allLinks.removeChild(allLinks.firstChild);
    }
  }

  if (!selected_node) {
    //reset form inputs
    document.getElementById('form').reset();
    clearLinks();
  } else {
    formName.attr('value', selected_node.name)
    formTitle.attr('value', selected_node.title)
    formLocation.attr('value', selected_node.location)
    clearLinks();
    //filter all links by id to get selected node's links
    let selectedLinks = links.filter(link => (link.source.id === selected_node.id))

    let connections = formLinks.selectAll('link')
    connections = connections.data(selectedLinks)
    //create a div for each link and display the name of the associated node
    connections.enter().append('div')
      .attr('class', 'link')
      .text((d) => (`${d.target.name}: ${d.relationship}`))
  }

  if (d3.event.ctrlKey || mousedown_node || mousedown_link) return;

  // insert new node at point
  let point = d3.mouse(this),
    node = { id: ++lastNodeId, reflexive: false };
    node.x = point[0];
    node.y = point[1];
    nodes.push(node);

  restart();
}

function mousemove() {
  if (!mousedown_node) return;

  // update drag line
  drag_line.attr('d', 'M' + mousedown_node.x + ',' + mousedown_node.y + 'L' + d3.mouse(this)[0] + ',' + d3.mouse(this)[1]);

  restart();
}

function mouseup() {
  if (mousedown_node) {
    // hide drag line
    drag_line
      .classed('hidden', true)
      .style('marker-end', '');
  }

  // because :active only works in WebKit?
  svg.classed('active', false);

  // clear mouse event vars
  resetMouseVars();
}

function spliceLinksForNode(node) {
  let toSplice = links.filter(function (l) {
    return (l.source === node || l.target === node);
  });
  toSplice.map(function (l) {
    links.splice(links.indexOf(l), 1);
  });
}

function deleteNode() {
  if (selected_node) {
    nodes.splice(nodes.indexOf(selected_node), 1);
    spliceLinksForNode(selected_node);
  } else if (selected_link) {
    links.splice(links.indexOf(selected_link), 1);
  }
  selected_link = null;
  selected_node = null;
  restart();
}

// function moveGraph() {
//   circle.call(force.drag);

//   circle
//     .on('mousedown.drag', null)
//     .on('touchstart.drag', null);
// }

// app starts here
svg.on('mousedown', mousedown)
  .on('mousemove', mousemove)
  .on('mouseup', mouseup);

restart();
