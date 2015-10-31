/*
        Smartdelivery dialog v0.9 - another jQuery Plugin
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
                    // overload this function for getting city name
                    getCity:        null,
                    // overload this functions for events
                    beforeShow:     null,
                    onShow:         null,
                    onChange:       null,
                    afterHide:     null,
                    // events booleans
                    hideOnChange:  false,
                    // dialog appearance
                    language:       'ua',
                    serviceFilter:   [],
                    dialogWidth:    null,
                    dialogHeight:   null,
                    servicesWidth:  null,
                    // api site urls
                    baseHref:       'http://api.smartdelivery.com.ua/v1/',
                    styleHref:       'http://static.smartdelivery.com.ua/v1/dialog/style/'
                };

                // init data

                var new_options = $.extend({},defaultOptions, options);
                
                $(this).data('smartdelivery', {
                    target : $this,
                    options: new_options,
                    variables: {},
                    elements: {} // for DOM objects
                });

                // add click event
                $(this).click(function() {
                    $(this).smartdelivery('show'); 
                    return false;
                });

                // add css file to header
                $('head').append('<link rel="stylesheet" type="text/css" href="' + new_options.styleHref + 'smartdelivery.css">');

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
            if (city === undefined || city === '') {
                alert($this.smartdelivery('_getFrase', 'give-me-city-title'));
                return;
            }

            var params = {
                type : 'full',
                city : city,
                language : data.options.language,
                service_filter : data.options.serviceFilter
            }

            var can_show_the_dialog = false;
            var Houses = false;

            // set sizes

            // dialog width by default is 80% of screen
            var dialog_width = data.options.dialogWidth ? data.options.dialogWidth : dialog_width = Math.round($(window).innerWidth() / 100 * 80);
            
            // dialog height by default is 70% of screen
            var dialog_height = data.options.dialogHeight ? data.options.dialogHeight : Math.round($(window).innerHeight() / 100 * 70);
            
            // services width by default is 1/3 of dialog
            var services_width = data.options.servicesWidth ? data.options.servicesWidth : Math.round(dialog_width / 3);

            // call beforeShow event(if exists)
            if (data.options.beforeShow) data.options.beforeShow.call();

            // call API
            $.getJSON(
                data.options.baseHref + '/houses?' + jQuery.param(params)
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
                    background: 'url(' + data.options.styleHref + '/overlay.png' + ')',
                    height: $(window).height()
                })
                .click(function() {
                    $this.smartdelivery('hide');
                });

                $('body').append(dialog_overlay);
                
                // init and show dialog

                var dialog = $('<div/>')
                .addClass('smartdelivery-dialog');

                $('body').append(dialog);

                // init and show dialog closer

                var header = $('<div/>')
                        .css('display', 'block')
                        .addClass('smartdelivery-header')
                        .append($this.smartdelivery('_getFrase', 'dialog-header') + ' ' + city);


                var dialog_closer = $('<div/>')
                .addClass('smartdelivery-dialog-closer')
                .attr('title', $this.smartdelivery('_getFrase', 'dialog-hide'))
                .css({
                    "background-image": 'url(' + data.options.styleHref + '/closer.png)'
                })
                .click(function() {
                    $this.smartdelivery('hide');
                });

                $(header).append(dialog_closer);
                $(dialog).append(header);

                // init filters
                
                var services_filter = $('<div />')
                        .css('display', 'block')
                        .addClass('smartdelivery-dialog-filter');

                // init and show services overlay

                var services_overlay = $('<div />')
                .addClass('smartdelivery-dialog-services-overlay')
                .css({
                    width: services_width,
                    height: dialog_height
                });

                services_overlay.append(services_filter);
                dialog.append(services_overlay);

                // append services selector

                var select_services = $('<select></select>')
                services_filter.append(select_services);

                // append services text finder

                var services_finder = $('<input />').attr({
                    type: 'text',
                    placeholder: $this.smartdelivery('_getFrase', 'filter-text-placeholder') + '...'
                });

                services_filter.append(services_finder);

                // append events for filtering

                select_services.change(function() {
                    filterHouses(select_services.val(), services_finder.val());
                });
                
                services_finder.keyup(function() {
                    filterHouses(select_services.val(), services_finder.val());
                });

                // append list for warehouses

                var select = $('<ul/>');
                services_overlay.append(select);

                // append empty filter message
                
                var empty_filter_message = $('<p/>')
                        .text($this.smartdelivery('_getFrase' ,'filter-result-empty'))
                        .css({diplay : 'none'});
                
                services_filter.append(empty_filter_message);

                // append map to dialog

                var map_canvas = $('<div/>')
                        .attr('id', 'smartdelivery_map_canvas')
                        .css({
                            display: 'block',
                            width: dialog_width - services_width,
                            height: dialog_height
                        });
                dialog.append(map_canvas);

                // show copyright
                
                var footer = $('<div/>')
                    .css('display', 'block')
                    .addClass('smartdelivery-copyright')
                    .html($this.smartdelivery('_getFrase', 'copyright') + ' <a target="_blank" href="http://smartdelivery.com.ua">smartdelivery.com.ua</a>')

                
                dialog.append(footer);

                // prepare map && list of services and houses

                var map = new google.maps.Map(document.getElementById("smartdelivery_map_canvas"), {mapTypeId: google.maps.MapTypeId.ROADMAP}); 
                var Services = new Array();
                var All_bounds = new google.maps.LatLngBounds();

                // prepare geo icons
                var marker_red = {
                    url: data.options.styleHref + '/marker-red.png',
                    size: new google.maps.Size(21, 32),
                    origin: new google.maps.Point(0,0),
                    anchor: new google.maps.Point(0, 32)
                };

                var marker_purple = {
                    url: data.options.styleHref + '/marker-purple.png',
                    size: new google.maps.Size(21, 32),
                    origin: new google.maps.Point(0,0),
                    anchor: new google.maps.Point(0, 32)
                };
                
                var marker_green = {
                    url: data.options.styleHref + '/marker-green.png',
                    size: new google.maps.Size(21, 32),
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

                    if (Houses[i]['service_alias'] == 'novaposhta') { Houses[i]['marker'].setIcon(marker_red) }
                    if (Houses[i]['service_alias'] == 'autolux') { Houses[i]['marker'].setIcon(marker_purple) }
                    if (Houses[i]['service_alias'] == 'privatbank') { Houses[i]['marker'].setIcon(marker_green) }

                    Houses[i]['infowindow'] = new google.maps.InfoWindow({
                        content: '<div class="smartdelivery-dialog-map-infowindow">' + 
                                '<strong>' + Houses[i]['city_title'] + '</strong>, '  + Houses[i]['service_title'] +
                                '<br />' + Houses[i]['title'] +
                                '<br /><a href="tel:' + Houses[i]['phones'] + '">' + Houses[i]['phones'] + '</a>' + 
                                '</div>'
                    });

                    // event to set house on click
                    google.maps.event.addListener(Houses[i]['marker'], 'click', function() {
                        $this.smartdelivery('_setHouse', this.id, true);
                    });

                    Houses[i]['marker'].setVisible(false);

                    All_bounds.extend(Houses[i]['latlng']);

                    if (Services.indexOf(Houses[i].service_title) == -1) {
                        Services.push(Houses[i].service_title);
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
                filterHouses();
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

                // center dialog and set size for elements

                dialog.css({
                    width:  dialog_width,
                    height: services_overlay.height() + header.height() + footer.height()
                });

                dialog.css({top:'50%',left:'50%',margin:'-'+(dialog.height() / 2)+'px 0 0 -'+(dialog.width() / 2)+'px'});

                // this function shows warehouses of selected services
                function filterHouses(service_id, search_string) {

                    select.find('li').remove();

                    var regular = new RegExp('^.*' + search_string + '.*$', 'i');
                    var filtered = 0;

                    for (var i in Houses) {
                        
                        if ((service_id === undefined || service_id === '' || Houses[i].service_title == service_id) && (search_string === undefined || search_string === '' || Houses[i].title.match(regular))) {

                            Houses[i]['marker'].setVisible(true);

                            var option = $('<li>'+Houses[i].service_title+': '+Houses[i].title+'</li>')
                            .addClass('house'+i)
                            .data('id', i)
                            .click(function() {
                                $this.smartdelivery('_setHouse', $(this).data('id'));
                            });
                            select.append(option);
                            ++filtered;

                        }
                        else {
                            Houses[i]['marker'].setVisible(false);
                            Houses[i]['infowindow'].close();
                        }

                    }
                    
                    if (filtered) {
                        empty_filter_message.hide();
                    }
                    else {
                        empty_filter_message.show();
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
                "dialog-header" : {
                    ua: 'Відділення у місті',
                    ru: 'Отделения в городе',
                    en: 'Warehouses in'
                },
                "dialog-hide" : {
                    ua: 'Натисніть, щоб закрити вікно',
                    ru: 'Нажмите, чтобы закрыть окно',
                    en: 'Click here to hide dialog'
                },
                "give-me-city-title" : {
                    ua: 'Будь ласка, спочатку вкажіть місто',
                    ru: 'Пожалуйста, сначала укажите город',
                    en: 'Please fill city first'
                },
                "ajax-error" : {
                    ua: 'Нажаль, сталася помилка під час запиту:',
                    ru: 'Произошла ошибка во время обработки запроса:',
                    en: 'Error while ajax:'
                },
                "ajax-no-houses" : {
                    ua: 'Нажаль, в цьому місті не знайдено жодного складу',
                    ru: 'В этом городе не найдено ни одного склада',
                    en: 'No warehouses in this city'
                },
                "filter-text-placeholder" : {
                    ua: 'Шукати за адресою чи номером відділення',
                    ru: 'Искать по адресу или номеру отделения',
                    en: 'Find by address or warehouse number'
                },
                "filter-result-empty" : {
                    ua: 'Нажаль, за вашим запитом не знайдено жодного відділення',
                    ru: 'К сожалению, по вашему запросу не найдено ни одного отделения',
                    en: 'unfortunately, no warehouses found by your request'
                },
                "show-services" : {
                    ua: 'Показати всі служби доставки',
                    ru: 'Показать все службы доставки',
                    en: 'Show all delivery companies'
                },
                "copyright" : {
                    ua: 'Цей діалог працює завдяки',
                    ru: 'Этот диалог работает благодаря',
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