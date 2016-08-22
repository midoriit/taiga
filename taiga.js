// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

var map;
var view;
var gsiLayer;
var zoom = 15;
var markerLayer;
var markerClusters;

var svDBpedia = 'http://ja.dbpedia.org/sparql';
var svSparqlEPCU = 'http://lodcu.cs.chubu.ac.jp/SparqlEPCU/api/taiga';
var dbpedia_base = 'http://ja.dbpedia.org/resource/';
var wikipedia_base = 'https://ja.wikipedia.org/wiki/';

$(function(){

  $.ajaxSetup({
    timeout: 6000
  });

  // 地理院地図
  map = L.map('mapdiv', {
    minZoom: 5,
    maxZoom: 14
  });
  var gsiLayer = L.tileLayer(
    'https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png', {
       opacity: 0.7,
       attribution: '<a href="http://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html" target="_blank">国土地理院</a>'
  });
  gsiLayer.addTo(map);
  map.setView([38, 138], 5);
  // dummy
  markerClusters = new L.markerClusterGroup();
  map.addLayer(markerClusters);

  L.easyButton('fa-info fa-lg',
    function() {
      $('#about').modal('show');
    },
    'このサイトについて',
    null, {
      position:  'bottomright'
    }).addTo(map);

  L.easyButton('fa-compress fa-lg',
    function() {
      map.setView([38, 138], 5);
    },
    '日本全体を表示',
    null, {
      position:  'topleft'
    }).addTo(map);

  var sparql = 
    'SELECT DISTINCT ?id ?nth ?label where {' +
    '?id schema:numberOfSeasons ?nth;' +
    'rdfs:label ?label.' +
    '} ORDER BY DESC(?nth)';
  var query = {
    query : sparql,
    format: 'application/sparql-results+json'
  };
  var req = $.getJSON(svSparqlEPCU, query, function(data){
    var list = data.results.bindings;
    for(i=0 ; i<list.length ; i++) {
      titlelist.innerHTML +=
        '<div id="title"><a onClick="showMap(\'' + list[i].nth.value + '\',\'' +
        list[i].label.value + '\',\'' + list[i].id.value + '\')">' +
        '第' + list[i].nth.value + '作 ' +
        list[i].label.value + '</a></div>';
    }
  });
});

function showMap(nth, label, id){
  map.removeLayer(markerClusters);
  markerClusters = new L.markerClusterGroup({
    showCoverageOnHover: false,
    maxClusterRadius: 20,
    spiderfyDistanceMultiplier: 2
  });
  map.addLayer(markerClusters);
  var wikipage = id.replace(dbpedia_base, wikipedia_base);
  headerSpan.innerHTML = '大河巡礼－<a href="' + wikipage + 
    '" target="_blank">第' + nth + '作 ' + label + '</a>';
  var sparql = 
    'SELECT DISTINCT ?uri WHERE {' +
    '<' + id + '> schema:actor ?o.' +
    '?o schema:roleName ?uri.' +
    '}';
  var query = {
    query : sparql,
    format: 'application/sparql-results+json'
  };
  $.getJSON(svSparqlEPCU, query, function(data){
    var list = data.results.bindings;
    for(i=0 ; i<list.length ; i++) {
      showPoiA(list[i].uri.value);
      showPoiB(list[i].uri.value);
    }
  });
}

// 人物からリンクしている地物
function showPoiA(uri){
  var sparql = 
    'SELECT DISTINCT ?page ?geo ?abst WHERE {' +
    '<' + uri + '> dbpedia-owl:wikiPageWikiLink ?page;' +
    'rdf:type foaf:Person.' +
    '?page georss:point ?geo;' +
    'dbpedia-owl:abstract ?abst.' +
    '}';
  var query = {
    query : sparql,
    format: 'application/sparql-results+json'
  };
  $.getJSON(svDBpedia, query, function(data){
    var list = data.results.bindings;
    for(i=0 ; i<list.length ; i++) {
      var latlng = list[i].geo.value.split(' ');
      var wikiname = list[i].page.value.replace(dbpedia_base, '');
      var wikipage = list[i].page.value.replace(dbpedia_base, wikipedia_base);
      var fromname = uri.replace(dbpedia_base, '');
      var frompage = uri.replace(dbpedia_base, wikipedia_base);
      var abst = list[i].abst.value;
      marker = L.marker([latlng[0], latlng[1]], {
        icon : L.VectorMarkers.icon({icon: 'user', markerColor: '#AAF'}),
        title: wikiname
      }).addTo(markerClusters).bindPopup(
        '<a href="' + frompage + '" target="_blank">' + fromname + '</a>ゆかりの？ ' + 
        '<a href="' + wikipage + '" target="_blank">' + 
        wikiname + '</a>' +
        '<div id="wk_abst">' +
        abst.substr(0, abst.indexOf('。')+1) + 
        '（<a href="' + list[i].page.value + '" target="_blank">DBpedia</a>）</div>');
    }
  });
}

// 人物へリンクしている地物
function showPoiB(uri){
  var sparql = 
    'SELECT DISTINCT ?page ?geo ?abst WHERE {' +
    '<' + uri + '> rdf:type foaf:Person.' +
    '?page dbpedia-owl:wikiPageWikiLink <' + uri + '>;' +
    'georss:point ?geo;' +
    'dbpedia-owl:abstract ?abst.' +
    '}';
  var query = {
    query : sparql,
    format: 'application/sparql-results+json'
  };
  $.getJSON(svDBpedia, query, function(data){
    var list = data.results.bindings;
    for(i=0 ; i<list.length ; i++) {
      var latlng = list[i].geo.value.split(' ');
      var wikiname = list[i].page.value.replace(dbpedia_base, '');
      var wikipage = list[i].page.value.replace(dbpedia_base, wikipedia_base);
      var fromname = uri.replace(dbpedia_base, '');
      var abst = list[i].abst.value;
      marker = L.marker([latlng[0], latlng[1]], {
        icon : L.VectorMarkers.icon({icon: 'search', markerColor: '#AAF'}),
        title: wikiname
      }).addTo(markerClusters).bindPopup(
        '<strong>' + fromname + '</strong>ゆかりの？ ' + 
        '<a href="' + wikipage + '" target="_blank">' + 
        wikiname + '</a>' +
        '<div id="wk_abst">' +
        abst.substr(0, abst.indexOf('。')+1) + 
        '（<a href="' + list[i].page.value + '" target="_blank">DBpedia</a>）</div>');
    }
  });
}
