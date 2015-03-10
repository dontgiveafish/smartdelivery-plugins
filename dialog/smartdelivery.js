/*
        Smartdelivery.in.ua dialog v0.9 - another jQuery Plugin
        By Anton Bagayev / Don't give a fish (www.dontgiveafish.com)
*/

(function( $ ){

var methods = {

    init : function( options ) {

        return this.each(function(){

            var $this = $(this),
            data = $this.data('smartdelivery');

            if ( ! data ) {

                /* init this place */

                var defaultOptions = {
                    // overload this function for city name
                    getCity:        null,
                    // functions for events
                    beforeShow:     null,
                    onShow:         null,
                    onChange:       null,
                    afterHide:     null,
                    // booleans
                    hideOnChange:  false,
                    showCopyright:  true,
                    // dialog appearance
                    language:       'ua',
                    onlyServices:   [],
                    dialogWidth:    '900px',
                    dialogHeight:   '500px',
                    servicesWidth:  '350px',
                    // api site
                    baseHref:       'http://smartdelivery.in.ua/'
                }

                // init data
                $(this).data('smartdelivery', {
                    target : $this,
                    options: $.extend({},defaultOptions, options),
                    variables: {},
                    elements: {} // for DOM objects
                });

                // add click event
                $(this).click(function() {
                    $(this).smartdelivery('show'); 
                    return false;
                });

            }

        });
    },
    destroy : function( ) {

        return this.each(function(){

            var $this = $(this),
            data = $this.data('smartdelivery');

            $(window).unbind('.smartdelivery');
            data.smartdelivery.remove();
            $this.removeData('smartdelivery');

        })

    },

    // method to show dialog
    show : function() {

        return this.each(function() {

            // get this and data
            var $this = $(this),
            data = $this.data('smartdelivery');

            if (data.variables.visible) return;

            // prepare city name and variables

            var city = ((data.options.getCity) === null) ? undefined : data.options.getCity.call();
            if (city === undefined) return;

            var can_show_the_dialog = false;
            var Houses = false;

            var only_services = data.options.onlyServices.join(',');
            if (only_services != '') only_services = '/onlyservices/' + only_services;

            // call beforeShow event(if exists)
            if (data.options.beforeShow) data.options.beforeShow.call();

            // call API
            $.getJSON(
                data.options.baseHref + 'api/houses/type/full/language/' + data.options.language + only_services + '/city/' + city
            )
            // if API answered correctly
            .done(function( json_data, status, xhr ) {

                    // OK
                    if (json_data.status == 'success') {

                        if (json_data.data.length > 0) {
                            can_show_the_dialog = true;
                            Houses = data.variables.houses = json_data.data;
                        }
                        else {
                            alert($this.smartdelivery('_getFrase', 'ajax-no-houses'));
                        }

                    }
                    // city not found
                    else if (json_data.status == 'fail' && json_data.messages.indexOf('city not found') > -1) {
                        alert($this.smartdelivery('_getFrase', 'ajax-no-houses'));
                    }

            })
            // if API not answered correctly
            .error(function( data, status, xhr ) {
                    alert($this.smartdelivery('_getFrase', 'ajax-error' + xhr));
            })
            // complete processing of answer
            .complete(function() {

                // call onShow event(if exists)
                if (data.options.onShow) data.options.onShow.call();
               
                if (!can_show_the_dialog) return;
                
                // init and show dialog overlay
                
                var dialog_overlay = $('<div/>')
                .addClass('smartdelivery-dialog-overlay')
                .css({
                    'height': $(document).height()
                })
                .click(function() {
                    $this.smartdelivery('hide');
                });

                $('body').append(dialog_overlay);
                
                // init and show dialog

                var dialog = $('<div/>')
                .addClass('smartdelivery-dialog')
                .css({
                    'width':  data.options.dialogWidth,
                    'height': data.options.dialogHeight
                });

                $('body').append(dialog);

                dialog.css({top:'50%',left:'50%',margin:'-'+(dialog.height() / 2)+'px 0 0 -'+(dialog.width() / 2)+'px'});

                // init and show dialog closer

                var dialog_closer = $('<div/>')
                .addClass('smartdelivery-dialog-closer')
                .attr('title', $this.smartdelivery('_getFrase', 'dialog-hide'))
                .css({
                    'top' : dialog.offset().top - $(document).scrollTop(),
                    'left' : dialog.offset().left + dialog.outerWidth() - $(document).scrollLeft(),
                    'background-image': 'url(' + data.options.baseHref + 'public/jquery-plugin/img/closer.png)'
                })
                .click(function() {
                    $this.smartdelivery('hide');
                });

                $('body').append(dialog_closer);

                // init and show services overlay

                var services_overlay = $('<div />')
                .addClass('smartdelivery-dialog-services-overlay')
                .css({
                    'width':  data.options.servicesWidth,
                    'height': data.options.dialogHeight
                });

                dialog.append(services_overlay);

                // append services selector

                var select_services = $('<select></select>')
                .click(function() {
                    showHouses($(this).val());
                });

                services_overlay.append(select_services);

                var select = $('<ul></ul>');
                services_overlay.append(select);

                // append map to dialog

                dialog.append(
                    $('<div id="smartdelivery_map_canvas"></div>').css({
                        'height': data.options.dialogHeight
                    })
                );

                // show copyright (if allowed in options)
                if (data.options.showCopyright) {
                    dialog.append(
                        $('<span/>')
                        .addClass('smartdelivery-copyright')
                        .html($this.smartdelivery('_getFrase', 'copyright') + ' <a target="_blank" href="'+data.options.baseHref+'">smartdelivery.in.ua</a>')
                    );
                }

                // prepare map && list of services and houses

                var map = new google.maps.Map(document.getElementById("smartdelivery_map_canvas"), {mapTypeId: google.maps.MapTypeId.ROADMAP}); 
                var Services = new Array();
                var All_bounds = new google.maps.LatLngBounds();

                // prepare geo icons
                var marker_red = {
                    url: data.options.baseHref + 'public/jquery-plugin/img/red32.png',
                    size: new google.maps.Size(21, 32),
                    origin: new google.maps.Point(0,0),
                    anchor: new google.maps.Point(0, 32)
                };

                var marker_purple = {
                    url: data.options.baseHref + 'public/jquery-plugin/img/purple32.png',
                    size: new google.maps.Size(20, 32),
                    origin: new google.maps.Point(0,0),
                    anchor: new google.maps.Point(0, 32)
                };

                // parse houses
                for (var i in Houses) {

                    Houses[i]['latlng'] = new google.maps.LatLng(Houses[i].latitude, Houses[i].longitude);

                    Houses[i]['marker'] = new google.maps.Marker({
                        position: Houses[i]['latlng'],
                        map: map,
                        title: Houses[i].title,
                        id: i
                    });

                    if (Houses[i]['service_sdcode'] == 'SNP') { Houses[i]['marker'].setIcon(marker_red) }
                    if (Houses[i]['service_sdcode'] == 'SAL') { Houses[i]['marker'].setIcon(marker_purple) }

                    Houses[i]['infowindow'] = new google.maps.InfoWindow({
                        maxWidth: 250,
                        content: '<div class="smartdelivery-dialog-map-infowindow">' + 
                                '<strong>' + Houses[i]['city'] + '</strong>, '  + Houses[i]['service'] +
                                '<br />' + '<img class="smartdelivery-icon" src="' + data.options.baseHref + 'public/jquery-plugin/img/geotag.png"> &nbsp;' + Houses[i]['title'] +
                                '<br />' + '<img class="smartdelivery-icon" src="' + data.options.baseHref + 'public/jquery-plugin/img/phone.png"> &nbsp;' + Houses[i]['phones'] +
                                '</div>'
                    });

                    // event to set house on click
                    google.maps.event.addListener(Houses[i]['marker'], 'click', function() {
                        $this.smartdelivery('_setHouse', this.id, true);
                    });

                    Houses[i]['marker'].setVisible(false);

                    All_bounds.extend(Houses[i]['latlng']);

                    if (Services.indexOf(Houses[i].service) == -1) {
                        Services.push(Houses[i].service);
                    }

                }

                // add services
                
                select_services.append(
                    $('<option value="">'+$this.smartdelivery('_getFrase' ,'show-services')+'</option>')
                );

                for (var i in Services) {
                    select_services.append(
                        $('<option value="'+Services[i]+'">'+Services[i]+'</option>')
                    );
                }

                // hide services selector if it's nothing to see here
                if (Services.length <= 1) select_services.hide();

                // show houses and center fit map to geotags
                showHouses();
                map.fitBounds (All_bounds);

                // save current state
                data.elements.map = map;
                data.elements.houses = select;
                data.elements.dialog = dialog;
                data.elements.dialog_overlay = dialog_overlay;
                data.elements.dialog_closer = dialog_closer;

                data.variables.visible = true;
                data.variables.n = data.variables.house = undefined;
                data.variables.houses = Houses;

                // this function shows warehouses of selected services
                function showHouses(service) {

                    select.find('li').remove();

                    for (var i in Houses) {
                        if (service === undefined || service === '' || Houses[i].service == service) {

                            Houses[i]['marker'].setVisible(true);

                            var option = $('<li>'+Houses[i].service+': '+Houses[i].title+'</li>')
                            .addClass('house'+i)
                            .data('id', i)
                            .click(function() {
                                $this.smartdelivery('_setHouse', $(this).data('id'));
//                                    $this.smartdelivery('_setHouse', 1);
                            });
                            select.append(option);

                        }
                        else {
                            Houses[i]['marker'].setVisible(false);
                            Houses[i]['infowindow'].close();
                        }

                    }

                }

            });

        });


    },

    // method to hide dialog
    hide : function() {

        return this.each(function() {

            // get this and data
            var $this = $(this),
            data = $this.data('smartdelivery');

            if (!data.variables.visible) return;

            // remove all DOM elements from document
            for (obj in data.elements) {
                $(data.elements[obj]).remove();
            }

            // save current state
            data.variables.visible = false;

            // call afterHide event(if exists)
            if (data.options.afterHide) data.options.afterHide.call();

        });

    },

    // method to return current house object
    getHouse : function() {
            return $(this).data('smartdelivery').variables.house;
    },

    // method to make house selected, private
    // n is number of house, scroll boolean to scroll or not to scroll wares list
    _setHouse : function(n, scroll) {

        return this.each(function() {

            // get this and data
            var $this = $(this),
            data = $this.data('smartdelivery');

            // define some variables for easy coding
            scroll = scroll || false;
            var last_n = data.variables.n;
            var houses = data.variables.houses;
            var select = data.elements.houses;

            // deselect(if selected) current house and hide infowindow
            if (last_n !== undefined) {
                select.find('li.house'+last_n).removeClass('selected');
                houses[last_n]['infowindow'].close();
            }

            // select current warehouse
            var li = select.find('li.house'+n).first().addClass('selected');

            // scroll warehouses list to selected warehouse
            if (scroll) li.get(0).scrollIntoView(false);

            // show infowindow
            var marker = houses[n]['marker'];
            houses[n]['infowindow'].open(data.elements.map, marker);

            // save current state
            data.variables.house = houses[n];
            data.variables.n = n;

            // call onChange function
            if (data.options.onChange) data.options.onChange.call();

            // close if hideOnChange is true
            if (data.options.hideOnChange) $this.smartdelivery('hide');

        });
    },

    // method frase from glossary, private
    _getFrase : function(frase, language) {
            if (frase === undefined) return;

            return {
                'dialog-hide' : {
                    ua: 'Натисніть, щоб закрити вікно',
                    ru: 'Нажмите, чтобы закрыть окно',
                    en: 'Click here to hide dialog'
                },
                'ajax-error' : {
                    ua: 'Нажаль, сталася помилка під час запиту: ',
                    ru: 'Произошла ошибка во время обработки запроса: ',
                    en: 'Error while ajax: '
                },
                'ajax-no-houses' : {
                    ua: 'Нажаль, в цьому місті не знайдено жодного складу',
                    ru: 'В этом городе не найдено ни одного склада',
                    en: 'No warehouses in this city'
                },
                'show-services' : {
                    ua: 'Показати всі служби доставки',
                    ru: 'Показать все службы доставки',
                    en: 'Show all delivery companies'
                },
                'copyright' : {
                    ua: 'Ця форма працює завдяки',
                    ru: 'Эта форма работает благодаря',
                    en: 'This dialog works on'
                }

            } [frase][language || $(this).data('smartdelivery').options.language] || frase;

    }

};

$.fn.smartdelivery = function( method ) {

    if ( methods[method] ) {
        return methods[method].apply( this, Array.prototype.slice.call( arguments, 1 ));
    } else if ( typeof method === 'object' || ! method ) {
        return methods.init.apply( this, arguments );
    } else {
        $.error( 'Method ' +  method + ' is not exist jQuery.smartdelivery' );
    }    

};

})( jQuery );