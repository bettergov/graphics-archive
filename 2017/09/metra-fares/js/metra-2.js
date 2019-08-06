window.onload = function(){
  //pymChild.sendHeight();

  var json = $.getJSON({'url': "https://graphics.bettergov.org/2017/09/metra-fares/data.json", 'async': false});
  //var json = $.getJSON({'url': "../data.json", 'async': false});
  json = JSON.parse(json.responseText);

  function loadStations(rail) {

    stations = []
    var route = json.rails[rail];
    for (zone in route) {
      for (station in route[zone]) {
        stations.push(route[zone][station] + " (Zone " + zone + ")");
      }
    }

    $('input[id*="point-"]').typeahead({
      source: stations,
      autoSelect: true
    });
  }

  $('input#rail-select').typeahead({
    source: Object.keys(json.rails),
    autoSelect: true
  });

  var $cached_rail = null;

  $('input#rail-select').change(function() {
    var $rail = $("#rail-select").val();
    if ($rail == $cached_rail) {
      return;
    } else {
      $('input[id*="point-"]').val(null)
      $('input[id*="point-"]').typeahead('destroy');
      $('#output').html(null);
      if ($rail && $rail != $cached_rail) {
        $cached_rail = $rail;
        loadStations($rail);
      } else {
        $cached_rail = null;
      }
    }
  });
}

function formatDollar(input) {
  return '$' + input.toFixed(2)
}

var stripZoneRegex = /.+(?= \(Zone [A-Z]\))/igm;
function stripZone(input) {
  try {
    return input.match(stripZoneRegex)[0];
  } catch (error) {
    return input;
  }
}

$('button').click(function() {
  rail = $('#rail-select').val()
  a = stripZone($('#point-a').val())
  b = stripZone($('#point-b').val())
  //bools = [false, true]
  //tickets = ["single", "ten", "month", "annual"]
  tickets = {"single": "Single", "ten": "Ten-ride", "month": "Monthly", "annual": "Annual <span class='detail'>(Month × 12)</span>"}
  ticket_keys = Object.keys(tickets)

  output = '<thead><tr>'
  output += '<th>Ticket</th>'
  /*for (year = 2014; year < 2019; year++) {
    output += '<th>' + year + '</th>';
  }*/
  output += '<th><span>2014 fare</span><span class="detail">Before "modernization"</span></th>'
  output += '<th><span>2017 fare</span><span class="detail">Current</span></th>'
  output += '<th><span>2018 fare</span><span class="detail">Proposed</span></th>'
  output+= '<th data-title="Change"><span>2014 to 2018</span><span class="detail">Since "modernization"</span></th>'
  output += '</tr></thead>'
  for (t in ticket_keys) {
    t = ticket_keys[t]
    output += '<tr>'
    output += '<td data-title="Ticket">'
    output += tickets[t]
    output += '</td>'

    var cache_fares = {}
    function outputFareValue(year, title) {
      var out = ''
      out += '<td data-title=\'' + title + '\'>'
      out += formatDollar(cache_fares[year])
      out += '</td>'
      return out
    }

    function genCells(year, title) {
      cache_fares[year] = calcPrice(rail, [a, b], t, year)
      output += outputFareValue(year, title)
    }

    // 2014
    genCells(2014, "Before \"modernization\" (2014 fare)")
    //2017
    genCells(2017, "Current (2017 fare)")
    //2018
    genCells(2018, "Proposed (2018 fare)")
    //Change
    fare_change = cache_fares[2018] - cache_fares[2014]
    output += '<td data-title="Change (2014 to 2018)">'
    output += formatDollar(fare_change)
    if (fare_change > 0) {
      output += ' <span class="percent">(' + (fare_change / cache_fares[2014] * 100).toFixed(1)+ '%)</span>'
    }
    output += '</td>'
    //}
    output += '</tr>'
  }
  $('#output').hide();
  $('#output').html(output);
  $('#output').fadeIn(500);
  pymChild.sendHeight();
});
