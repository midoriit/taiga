// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

var map;
var view;
var gsiLayer;
var zoom = 15;
var markerLayer;
var markerClusters;
var error_flg = false;

var svDBpedia = 'http://ja.dbpedia.org/sparql';
var dbpedia_base = 'http://ja.dbpedia.org/resource/';
var wikipedia_base = 'https://ja.wikipedia.org/wiki/';

$(function(){

  $.ajaxSetup({
    timeout: 15000
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

  var req = $.getJSON('/data/taiga.json', function(data){
    list = data.work;
    for(i=0 ; i<list.length ; i++) {
      $('#titlelist').append(
        '<div id="title"><a onClick="showMap(\'' + list[i].nth + '\',\'' +
        list[i].label + '\',\'' + list[i].id + '\',\'' + list[i].url + '\')">' +
        '第' + list[i].nth + '作 ' +
        list[i].label + '</a></div>');
    }
  }).fail(function(xhr, textStatus, errorThrown) {
    alert('taiga.json取得エラー : ' + errorThrown);
  });
});

function showMap(nth, label, id, url){
  map.removeLayer(markerClusters);
  markerClusters = new L.markerClusterGroup({
    showCoverageOnHover: false,
    maxClusterRadius: 20,
    spiderfyDistanceMultiplier: 2
  });
  map.addLayer(markerClusters);
  var wikipage = id.replace(dbpedia_base, wikipedia_base);
  $('#headerSpan').html('大河巡礼－<a href="' + wikipage + 
    '" target="_blank">第' + nth + '作 ' + label + '</a>');

  var store = $rdf.graph();
  var timeout = 5000;
  var fetcher = new $rdf.Fetcher(store, timeout);

  fetcher.nowOrWhenFetched(url, function(ok, body, xhr) {
    if (!ok) {
      alert('RDF取得エラー');
    } else {
      var roleNames = store.statementsMatching(undefined, $rdf.sym('http://schema.org/roleName'), undefined);
      var uris = [];
      for (var i=0; i<roleNames.length; i++) {
        if( uris.indexOf(roleNames[i].object.uri) < 0 ) {
          uris.push(roleNames[i].object.uri);
        }
      }
      for (var i=0; i<uris.length; i++) {
        showPoiA(uris[i]);
        showPoiB(uris[i]);
      }
    }
  })
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
  }).error(function() {
    if (!error_flg) {
      error_flg = true;
      alert("DBpedia 接続エラー");
    }
  }).success(function() {
      error_flg = false;
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
  }).error(function() {
    if (!error_flg) {
      error_flg = true;
      alert("DBpedia 接続エラー");
    }
  }).success(function() {
      error_flg = false;
  });
}
