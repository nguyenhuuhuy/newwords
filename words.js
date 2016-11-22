var datas = [];
var events = [];
var listeningWords = [];
datas = StorageApi.getAllWordFromLocalStorage();
events = StorageApi.getAllWordForDisplayingOnCalendar(datas);
function updateViewCountToUi(word){
  var wordObj = StorageApi.updateViewCountToLocalStorage(word);
  var id = wordObj.text.replace(/\s+/g, '_');
  $('#viewCount_'+id).html(wordObj.viewCount);
  return wordObj.viewCount;
}

var dicUrl = "https://en.oxforddictionaries.com/definition/";
//var dicUrlResult = 'https://en.oxforddictionaries.com/search?utf8=%E2%9C%93&filter=dictionary&query=';
var dicUrlResult = dicUrl;
var googleImagesApi = 'https://ajax.googleapis.com/ajax/services/search/images?v=1.0&rsz=8&q=';
var googleImagesWeb = 'https://www.google.com/search?tbm=isch&q=';
var cambridgeDic = 'http://dictionary.cambridge.org/dictionary/english/';
var dynamicTable = null;
var audios = [];
function stopAudios(){
  _.map(audios, function(audio){
    audio.pause();
  });
}
$.ajaxSetup({ cache: true });
$(function(){
  $('button#showAddForm').click(function(){
    $(this).hide();
    $('div#add').show();
    $('div#dicOptoin').hide();
    $('#tableView, #calendar, #google-images').hide();
  });

  $('button#cancelWords').click(function(){
    $('div#add').hide();
    $('div#dicOptoin').show();
    $('button#showAddForm').show();
    $('#tableView, #calendar, #google-images').show();
  });

  $('button#saveWords').click(function(){
    $('div#add').hide();
    $('button#showAddForm').show();
    $('div#dicOptoin').show();
    $('#tableView, #calendar, #google-images').show();
    var listWords = $('#inputeText').val().toLowerCase().split(/[\n\r,;]+/i);
    //console.dir(listWords);
    //console.log($('#inputeText').val().toLowerCase());
    listWords = _.map(listWords, function(it){
      return it.trim();
    });
    listWords = _.uniq(listWords);
    listWords = _.filter(listWords, function(word){
      return word != undefined && word != null && word != '';
    });

    //console.dir(listWords);
    //add list word to storage
    var listWordsSyn = {};
    _.map(listWords, function(word){
      var selectedText = word.toLowerCase();
      var url = '';
      var wordObj = localStorage.getObject(selectedText);
      if(wordObj == undefined || wordObj == null) {
        localStorage.setObject(selectedText, {
          "text": selectedText,
          "date": new Date(),
          "url": url,
          "viewCount": 0,
          "savedCount": 1
        });
      } else {
        wordObj.date = new Date();
        wordObj.savedCount = (wordObj.savedCount==undefined ? 0 : wordObj.savedCount) + 1;
        localStorage.setObject(selectedText, wordObj);
      }
      listWordsSyn[selectedText] = localStorage.getItem(selectedText);
    });

    //synch to chrome storage
    try
    {
      chrome.storage.sync.set(listWordsSyn, function(){
      });
    }
    catch(err) {

    }

    window.location.reload();
  });



  dynamicTable = $('#my-final-table').dynatable({
    dataset: {
      records: datas
    },
    writers: {
      _rowWriter: function(rowIndex, record, columns, cellWriter) {
        var tdClass = '';
        if(_.includes(listeningWords, record.text.toLowerCase())) {
          tdClass = 'listening'
        }
        var id = record.text.replace(/\s+/g, '_');
        var source = '<td>&nbsp;</td>';
        var savedCount = '<td>&nbsp;</td>';
        var viewCount = '<td id="viewCount_' + id + '">&nbsp;</td>';
        //var action = '<td><a class="action" word="'+ record.text +'" href="#">delete</a></td>';
        var action = '<td><span class="action" word="'+ record.text +'"><i class="material-icons">more_vert</i></span></td>';
        if(record.urls) {
          if(record.urls.length == 1){
            source = '<td><a target="_blank" href="' + record.urls[0] + '#__highlightword=' + record.text +'">source</a></td>';
          } else {
            source = '<td><a target="_blank" href="sources.html?word='+ record.text +'">sources</a>('+record.urls.length+')</td>';
          }
        } else if(record.url) {
          source = '<td><a target="_blank" href="' + record.url + '#__highlightword=' + record.text +'">source</a></td>';
        }
        if(record.savedCount) {
          savedCount = '<td>' + record.savedCount + '</td>';
        }
        if(record.viewCount) {
          viewCount = '<td id="viewCount_' + id + '">' + record.viewCount + '</td>';
        }
        var cambridgeWordLink = cambridgeDic + record.text;
        var cambridgeLink = ' <a id="cambridge_'+id+'" target="_blank" word="'+record.text+'" href="'+cambridgeWordLink+'"><image class="cambridge_icon" src="images/cambridge.ico"></a>';
        var textWithLink = "<a google-image='' target='_blank' id='text_" + id
          + "' href='" + dicUrlResult + record.text +"'>" + record.text + "</a>"
          + cambridgeLink
          + ' <a href="' + googleImagesWeb + record.text + '" target="_blank"><image class="google_icon" src="images/googleg_lodp.ico"></a>'
          + ' <a href="https://translate.google.com/#en/vi/' + record.text + '" target="_blank"><image class="google_icon" src="images/google_translate.ico"></a>'
          + "<span class='correctedWord' id='phonetic_" + id + "'></span><span id='wordType_" + id + "'></span>"
          + "<br/> <span id='meaning_" + id + "'></span><span class='examples' id='examples_" + id + "'></span>";
        return '<tr class="' + tdClass + '"><td style="text-align: left;">' + textWithLink + '</td><td style="text-align: left;">' + record.date + '</td>' + savedCount + viewCount + source + action + '</tr>';
      }
    },
  }).data('dynatable');

  $('body').on('click', "a[id^=text_]", function () {
    var text =($(this).text());
    var viewCount = updateViewCountToUi(text);
    dynamicTable.settings.dataset.originalRecords = _.map(dynamicTable.settings.dataset.originalRecords, function(it){
      if(it.text == text){
        it.viewCount = viewCount;
      }
      return it;
    });
    dynamicTable.process();
  });

  dynamicTable.queries.functions['hideDate'] = function(record, queryValue) {
      return queryValue == record.hideDate;
  };

  $('#calendar').fullCalendar({
    header: {
      left: 'prev,next today',
      center: 'title',
      right: 'month,agendaWeek,agendaDay'
    },
    defaultDate: moment().format('YYYY-MM-DD'),
    editable: false,
    eventLimit: true, // allow "more" link when too many events
    events: events,
    dayClick: function(date, jsEvent, view) {
      dynamicTable.queries.add("hideDate",date.format('YYYY-MM-DD'));
      dynamicTable.process();
    }
  });

  $(document).tooltip({
      items: '[google-image],span.fc-title',
      tooltipClass: 'images-tooltip',
      content: function(callback){
        var text =($(this).text());
        $.get(googleImagesWeb + text, function(data){
            var listImages = $.map($(data).find('[data-src^=http]'),function(item){
              var linkData = $(item).parent().attr('href');

              return {
                url: $(item).attr('data-src'),
                realUrl: /imgurl=([^&]+)/.exec(linkData)[1],
                refUrl: /imgrefurl=([^&]+)/.exec(linkData)[1]
              };
            });
            var listImagesContent = _.map(listImages, function(it){
            return '<img src="' + it.url + '"/>';
            });
            var listBigImage = _.map(listImages, function(it){
              return '<img src="' +it.realUrl + '" />';
            });
            $('#google-images').html(listBigImage);
            callback(listImagesContent.join(' '));
          });
      },
      position: {
        my: "left top+15",
        at: "left bottom+15",
        collision: "flipfit flip"
      },
    });

  $('body').on('click', "span.fc-title", function () {
    var text =($(this).text());
    window.open(dicUrlResult + text);
  });

  $('body').on('mouseover', "span.fc-title, a[id^=text_]", function () {
    var text = $(this).text();
    var id = text.replace(/\s+/g, '_');
    $.get(dicUrlResult + text, function(dicResult, textStatus, xhr){
      var mp3 = $(dicResult).find('.headwordAudio audio:eq(0)').attr('src');
      if(mp3 != undefined){
        makeSoundAndMeaning(id, dicResult);
      }
    });
  });
  $('#isUKDic').click(function(){    
    if($(this).is(':checked')){
      dicUrl = "https://en.oxforddictionaries.com/definition/";
      dicUrlResult = 'https://en.oxforddictionaries.com/definition/';
    } else {
      dicUrl = "https://en.oxforddictionaries.com/definition/us/";
      dicUrlResult = 'https://en.oxforddictionaries.com/definition/us/';
    }
  });

  var hideTimeout = null;
  $(document).keydown(function(event){
    if(event.which=="17" && $('#add').css('display') == 'none') {
      $('#isUKDic').trigger('click');
      var message = '';
      if($('#isUKDic').is(':checked')){
        message += "English UK";
      } else {
        message += "English US";
      }
      $('#notice').html(message);
      $('#notice').show();
      clearTimeout(hideTimeout);
      hideTimeout = setTimeout(function(){
        $('#notice').hide();
      }, 1500);
    }    
  });

  $.contextMenu({
        selector: 'span.action', 
        trigger: 'left',
        callback: function(key, options) {
            var word = $(this['context']).attr('word');
            if(key == 'delete') {
              if(confirm('Are you sure to remove the word: ' + word)){
                localStorage.removeItem(word);
                window.location.reload();
              }
            } else if(key == 'listen') {
              //add words to listening list
              listeningWords.push(word);
              $(this['context']).closest('tr').addClass('listening');
              getDictionaryDataOfWord(word, addSoundOfWordToPlaylist);
            }
        },
        items: {
            "listen": {name: "Listen", icon: "listen"},
            "delete": {name: "Delete", icon: "delete"},            
        }
    });

});

function makeSoundAndMeaning(id, dicDataWebContent){
  var dicData = getDicDataFromWebContent('', dicDataWebContent);
  $('#phonetic_'+id).text(dicData.phonetic);
  $('#wordType_'+id).text(dicData.partOfSpeech);
  $('#meaning_' + id).text(dicData.meaning);
  $('#examples_' + id).html(dicData.examplesText);
  $('#text_' + id).attr('correctedWord', dicData.correctedWord);
  $('#cambridge_' + id).attr('href', cambridgeDic + dicData.correctedWord);
  var audio = new Audio();
  audio.src = dicData.mp3;
  stopAudios();
  audio.play();
  audios.push(audio);
}

function getDictionaryDataOfWord(text, callback){
  $.get(dicUrlResult + text, function(dicDataWebContent){
    var url = $(dicDataWebContent).find('#searchPageResults a:eq(0)').attr('href');
    var mp3 = $(dicDataWebContent).find('.audio_play_button:eq(0)').attr('data-src-mp3');
    if(mp3 != undefined){
      var dicData = getDicDataFromWebContent(text, dicDataWebContent);
      callback(dicData);
    } else {
      $.get(url, function (dicDataWebContent) {
        var dicData = getDicDataFromWebContent(text, dicDataWebContent);
        callback(dicData);
      });
    }
  });
}

function getDicDataFromWebContent(word, dicDataWebContent){
  var dicDataDom = $(dicDataWebContent);
  var mp3 = dicDataDom.find('.audio_play_button:eq(0)').attr('data-src-mp3');
  var title = dicDataDom.find('.pageTitle:eq(0)').text().trim().replace(/\d+/i, '');
  var phonetic = dicDataDom.find('.headpron:eq(0)').text();
  phonetic = phonetic.replace('Pronunciation:', title);
  var meaning = dicDataDom.find('.definition:eq(0)').text();
  var partOfSpeech = _.map(dicDataDom.find('.partOfSpeechTitle > .partOfSpeech'), function(partOfSpeech){
    return $(partOfSpeech).text();
  });
  partOfSpeech =  '(' + _.uniq(partOfSpeech).join(', ') + ')';
  var examples = _.map(dicDataDom.find('.msDict.sense:eq(0) .exampleGroup.exGrBreak'), function(item){
    return $(item).text();
  });
  var examplesText = examples.join('<br/>');
  return {
    word: word,
    correctedWord: title,
    title: title,
    mp3: mp3,
    phonetic: phonetic,
    meaning: meaning,
    partOfSpeech: partOfSpeech,
    examples: examples,
    examplesText: examplesText
  }
}

function playAudio(audioSrc){
  var audio = new Audio();
  audio.src = audioSrc;
  stopAudios();
  audio.play();
}

function addSoundOfWordToPlaylist(dicData){
  if($('ul.sm2-playlist-bd li[word="'+dicData.word+'"]').length == 0){
    var wordData = "<span class='correctedWord'>"+dicData.phonetic+"</span><span>" + dicData.partOfSpeech +"</span>"
          + "<span>"+dicData.meaning+"</span>";
    $('ul.sm2-playlist-bd').append('<li word="'+dicData.word+'"><a href="'+dicData.mp3+'">'+wordData+'</a></li>');
  }
}
