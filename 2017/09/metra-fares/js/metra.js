//TODO Should only be declaring this in one spot
var json = $.getJSON({'url': "https://graphics.bettergov.org/2017/09/metra-fares/data.json", 'async': false});
//var json = $.getJSON({'url': "../data.json", 'async': false});
json = JSON.parse(json.responseText);

var fares = json.fares

function calcPrice(rail, points, ticket, year) {

  scope = json.rails[rail]
  zones = Object.keys(scope)

  function isInArray(value, array) {
    return array.indexOf(value) > -1;
  }

  function getZone(stop) { //TODO better lookup?
    for (zone in zones) {
      if (isInArray(stop, scope[zones[zone]])) {
        return zones[zone];
      }
    }
  }

  function calcIndexFromPoints (rail, points) {
    if (points[0] == points[1]) { return -1 }
    zone_a = getZone(points[0]);
    zone_b = getZone(points[1]);
    distance = Math.abs(zone_a.charCodeAt(0) - zone_b.charCodeAt(0));
    if (zone_a == 'M' || zone_b == 'M') { // Metra fares skip L, so need to subtract 1 if M
      distance -= 1
    }
    return distance;
  }

  distance = calcIndexFromPoints(rail, points);
  if(distance >= 0) {
    price = fares[year][ticket][distance]
  } else {
    price = 0
  }
  return (Math.round(price * 4) / 4)

};
