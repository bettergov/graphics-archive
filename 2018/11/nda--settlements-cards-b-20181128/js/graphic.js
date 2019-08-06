// Global vars
var pymChild = null;
var isMobile = false;
var flkty = null;
var touchStartX = null;
var touchStartY = null;
var parser = new DOMParser();

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
	pymChild = new pym.Child({
		renderCallback: render
	});

	navigationBtns = document.querySelectorAll('.navigation .arrows');
	navigationBtns.forEach(function(btn) {
		btn.addEventListener('click', onNavigationClick);
	});

	buildCards(DATA);
};

var buildCards = function(data) {
	for (var i = 0; i < data.length; i++) {
		buildCard(data[i], parser);
	}

	document.querySelector('.total').innerHTML = data.length;

	flkty = new Flickity('.cards', {
		cellSelector: '.card-main',
		draggable: isMobile,
		pageDots: false,
		setGallerySize: false,
		cellAlign: 'center',
		adaptiveHeight: true,
		prevNextButtons: false,
		friction: 1.5,
		selectedAttraction: 0.2,
		dragThreshold: 30
	});
	flkty.on('select', onFlickitySelect);

	cards = document.querySelectorAll('.card-main');

	for (var i = 0; i < cards.length; i++) {
		cards[i].addEventListener('click', onCardClick);
	}

	pymChild.sendHeight();

	document.addEventListener('touchstart', onTouchStart);
	document.addEventListener('touchmove', onTouchMove);
};

var buildCard = function(data, parser) {
	if (data['image']) {
		data['image'] = './static/' + data['image'];
	}

	// var categorySlug = classify(data['category']);
	// var date = new Date(data['last_updated']);
	// var dateStr =
	// 	AP_MONTHS[date.getMonth()] +
	// 	' ' +
	// 	date.getDate() +
	// 	', ' +
	// 	date.getFullYear();

	// data['last_updated'] = dateStr;
	// data['category_slug'] = categorySlug;

	var cardMain = document.querySelector('#card-main').innerHTML;
	var cardMainTemplate = _.template(cardMain);
	var cardMainCompiled = parser
		.parseFromString(
			cardMainTemplate({
				item: data
			}),
			'text/html'
		)
		.querySelector('.card-main');

	document.querySelector('.cards').append(cardMainCompiled);
};

var onFlickitySelect = function() {
	var i = this.selectedIndex;

	document.querySelector('.current').innerHTML = i + 1;

	if (i === 0) {
		document.querySelector('.arrow-prev').classList.add('disabled');
	} else {
		document.querySelector('.arrow-prev').classList.remove('disabled');
	}

	if (i === this.cells.length - 1) {
		document.querySelector('.arrow-next').classList.add('disabled');
	} else {
		document.querySelector('.arrow-next').classList.remove('disabled');
	}

	for (var j = 0; j < cards.length; j++) {
		if (j < i) {
			cards[j].classList.add('before');
			cards[j].classList.remove('after');
		} else if (j > i) {
			cards[j].classList.add('after');
			cards[j].classList.remove('before');
		} else {
			cards[j].classList.remove('before');
			cards[j].classList.remove('after');
		}
	}
};

var onNavigationClick = function() {
	if (this.querySelector('.prev')) {
		flkty.previous();
	} else {
		flkty.next();
	}
};

var onCardClick = function() {
	if (this.classList.contains('is-selected')) {
		return;
	}

	if ([].indexOf.call(cards, this) > flkty.selectedIndex) {
		flkty.next();
	} else {
		flkty.previous();
	}
};

var onTouchStart = function(e) {
	touchStartX = e.touches[0].clientX;
	touchStartY = e.touches[0].clientY;
};

var onTouchMove = function(e) {
	var lastTouchX = e.changedTouches[0].clientX;
	var lastTouchY = e.changedTouches[0].clientY;
	var diffX = Math.abs(touchStartX - lastTouchX);
	var diffY = Math.abs(touchStartY - lastTouchY);

	if (diffY < 20 && diffX > 20) {
		e.preventDefault();
	} else {
		return true;
	}
};

var render = function(containerWidth) {
	if (pymChild) {
		pymChild.sendHeight();
	}
};

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
