let form = document.querySelector("#url-form");
let url = document.querySelector('#url');
let $wrapper = document.querySelector('#wrapper');
let $messaging = document.querySelector('#messaging');
let $counterStatus = document.querySelector('#counter-status');

form.addEventListener('submit', function (e) {
  e.preventDefault();

  if (url.value.length === 0 || url.value.indexOf('http') === -1) {
    clearOutMessages();
    addMessage('Url must be valid', 'is-error');
    return;
  }

  let socket = io.connect();

  socket.on('getUrl', () => {
    socket.emit('getUrlSuccess', url.value);
    $wrapper.classList.toggle('start');
  });

  socket.on('new scent', (response) => {
    addMessage(response.msg);
  });

  socket.on('whine', (response) => {
    addMessage(response.msg, 'is-warning');
  });

  socket.on('heel', () => {
    clearOutMessages();
  });

  socket.on('yelp', (response) => {
    addMessage(response.msg, 'is-primary');
  });

  socket.on('start flush', () => {
    $counterStatus.className = $counterStatus.className.replace(/\bd-none\b/g, "");
  });

  socket.on('flush', (response) => {
    $counterStatus.innerHTML = response.msg;
    showDog();
  });

  socket.on('bad dog', (response) => {
    addMessage(response.msg, 'is-error');
  });

  socket.on('laydown', (response) => {
    addMessage(response.msg, 'is-success');
    $wrapper.classList.toggle('start');
    $wrapper.classList.toggle('done');
    $wrapper.classList.toggle('searching');
  });
});

function clearOutMessages(){
  console.log('clear out the messages');
  $messaging.innerHTML = '';
  $counterStatus.innerHTML = '';
};

function addMessage(message, className) {
  let html = document.createElement('li');
  html.classList.add('container');
  if (className){
    html.classList.add(className);
  }
  html.innerHTML = message;
  $messaging.appendChild(html);
};

function showDog(){
  $wrapper.classList.add('searching');
}
