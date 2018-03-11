// set up SVG for D3
const width = 960,
  height = 500,
  colors = d3.scale.category10();

const svg = d3.select('body')
  .append('svg')
  .attr('oncontextmenu', 'return false;')
  .attr('width', width)
  .attr('height', height);

//Form variables declared here
const form = d3.select('form')
const formName = d3.select('#name')
const formTitle = d3.select('#title')
const formLocation = d3.select('#location')
const formLinks = d3.select('#links')

// set up initial nodes and links
//  - reflexive edges are indicated on the node (as a bold black circle).
//  - links are always source < target; edge directions are set by 'left' and 'right'.
let nodes = [
  { id: 0, name: 'John Snow', title: 'Lord of Winterfell', location: 'Winterfell', reflexive: false },
  { id: 1, name: 'Sansa Stark', title: 'Lady of Winterfell', location: 'Winterfell', reflexive: true },
  { id: 2, name: 'Petyr Baelish', title: 'Littlefinger', location: 'Capitol', reflexive: false }
  ],
  lastNodeId = 2,
  links = [
    { source: nodes[0], target: nodes[1], left: false, right: true },
    { source: nodes[1], target: nodes[2], left: false, right: true }
  ];

// init D3 force layout
const force = d3.layout.force()
  .nodes(nodes)
  .links(links)
  .size([width, height])
  .linkDistance(150)
  .charge(-500)
  .on('tick', tick)

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
  .attr('fill', '#000');

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
      // if (d3.event.ctrlKey) return;

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

  // update existing nodes (reflexive & selected visual states)
  circle.selectAll('circle')
    .style('fill', function (d) { return (d === selected_node) ? d3.rgb(colors(d.id))
    .brighter().toString() : colors(d.id); })
    .classed('reflexive', function (d) { return d.reflexive; });

  // add new nodes
  let g = circle.enter().append('svg:g');
  g.append('svg:circle')
    .attr('class', 'node')
    .attr('r', 12)
    .style('fill', function (d) { return (d === selected_node) ? d3.rgb(colors(d.id)).brighter().toString() : colors(d.id); })
    .style('stroke', function (d) { return d3.rgb(colors(d.id)).darker().toString(); })
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
    .attr('x', 50)
    .attr('y', 4)
    .attr('class', 'id')
    .text(function (d) {
      return d.name;
    });

  // remove old nodes
  circle.exit().remove();

  // set the graph in motion
  force.start();
}

//Our form button submit
function formUpdate(event) {
  //update the data on the selected node based on the form input
  let nodeId = selected_node.id;
  nodes[nodeId].name = formName.property('value');
  nodes[nodeId].title = formTitle.property('value');
  nodes[nodeId].location = formLocation.property('value');

  //filter by id to find the correct circle and grab the child text element
  let allCircles = circle.enter()
  let selectedCircle = allCircles[0].update.filter(ourCircle => (ourCircle.__data__.id === nodeId))
  let innerText = selectedCircle[0].lastChild

  //add new text from form to circle
  d3.select(innerText)
    .text(function(d){
      return d.name
  })
}

function mousedown() {
  // because :active only works in WebKit?
  svg.classed('active', true);

  if (!selected_node) {
    //hide the form
    form.style('opacity', 0)
    //reset form inputs
    document.getElementById('form').reset();
    //remove all relationship elements for the selected node
    let allLinks = document.getElementById('links')
    while (allLinks.firstChild) {
      allLinks.removeChild(allLinks.firstChild);
    }
  } else {
    formName.attr('placeholder', selected_node.name)
    formTitle.attr('placeholder', selected_node.title)
    formLocation.attr('placeholder', selected_node.location)

    //filter all links by id to get selected node's links
    let selectedLinks = links.filter(link => (link.source.id === selected_node.id))

    let connections = formLinks.selectAll('link')
    connections = connections.data(selectedLinks)
    //create a div for each link and display the name of the associated node
    connections.enter().append('div')
      .attr('class', 'link')
      .text((d) => (d.target.name))

    form.style('opacity', 1)
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

// only respond once per keydown
// let lastKeyDown = -1;

// function keydown() {
//   d3.event.preventDefault();

//   if (lastKeyDown !== -1) return;
//   lastKeyDown = d3.event.keyCode;

//   // ctrl
//   if (d3.event.keyCode === 17) {
//     circle.call(force.drag);
//     svg.classed('ctrl', true);
//   }

//     case 66: // B
//       if (selected_link) {
//         // set link direction to both left and right
//         selected_link.left = true;
//         selected_link.right = true;
//       }
//       restart();
//       break;
//     case 76: // L
//       if (selected_link) {
//         // set link direction to left only
//         selected_link.left = true;
//         selected_link.right = false;
//       }
//       restart();
//       break;
//     case 82: // R
//       if (selected_node) {
//         // toggle node reflexivity
//         selected_node.reflexive = !selected_node.reflexive;
//       } else if (selected_link) {
//         // set link direction to right only
//         selected_link.left = false;
//         selected_link.right = true;
//       }
//       restart();
//       break;
//   }
// }

// function keyup() {
//   lastKeyDown = -1;

//   // ctrl
//   if (d3.event.keyCode === 17) {
//     circle
//       .on('mousedown.drag', null)
//       .on('touchstart.drag', null);
//     svg.classed('ctrl', false);
//   }
// }

// app starts here
svg.on('mousedown', mousedown)
  .on('mousemove', mousemove)
  .on('mouseup', mouseup);
restart();
