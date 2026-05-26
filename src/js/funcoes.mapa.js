
// função para receber valor do filtro e enviar parametro para criar a mascara
function enviarPara() {

  const input = document.getElementById("search");

  input.oninput = function () {

    const filtro = document.getElementById("filtroMapa").value;

    mascara(this, filtro);
  };
}


// função que cria a mascara 
function mascara(input, tipo) {
  let valor = input.value.replace(/\D/g, ''); // remove tudo que não for número

  if (tipo === 'Inscrição') {
    input.maxLength = 14;
    valor = valor
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1.$2')
      .replace(/\.(\d{3})(\d)/, '.$1.$2');

    input.value = valor;

  }
  if (tipo === 'CEP') {
    input.maxLength = 9; // 8 números + 1 hífen

    valor = valor
      .replace(/^(\d{5})(\d)/, '$1-$2');

    input.value = valor;
  }
}

const params = new URLSearchParams(window.location.search);
const mapa = params.get("mapa");
const select = document.getElementById('filtroMapa');
var opcoes = null;

// função para atribuir as opções pro select 
function preencherSelect(campos) {

  opcoes += "<option value=''></option>"
  campos.forEach(function (item) {
    opcoes += "<option value='" + item + "'>" + item + "</option>"

  })

  select.innerHTML = opcoes;

}


if (!mapa) {
  alert('Parâmetro "mapa" não informado na URL.');
  throw new Error('Parâmetro "mapa" ausente');
}

if (!/^[a-zA-Z0-9_-]+$/.test(mapa)) {
  throw new Error('Nome de mapa inválido.');
}


var map = L.map('map').setView([-23.85, -46.13], 12);
let camada = "";

var tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  minZoom: 12,
  maxZoom: 19,
  attribution: '© OpenStreetMap'
}).addTo(map);




function manualPrint () {

  map.invalidateSize();

var size = map.getSize();

console.log(size.x);

  var printer = L.easyPrint({
    tileLayer: tiles,
    sizeModes: [{width: size.x,
                height: size.y,
                className: 'customSize',
                tooltip: 'Custom Size'}],
    filename: 'myMap',
    exportOnly: true,
    hideControlContainer: true
  }).addTo(map);

  printer.printMap('customSize', 'MyManualPrint');

  domtoimage.toPng(document.getElementById('map'))
  .then(function (dataUrl) {

      const win = window.open('');

      win.document.write(`
          <img src="${dataUrl}" style="width:100%">
      `);

      win.document.close();

      win.onload = () => {
          win.print();
      };

  });
}





var cores = {};

// função que gera cores
function getRandomColor() {
  return "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
}

//Pega a categoria pra gerar as cores
function getColor(categoria) {
  if (!cores[categoria]) {
    cores[categoria] = getRandomColor();
  }
  return cores[categoria];
}


fetch('./' + mapa + '.geojson')
  .then(res => {
    if (!res.ok) {
      throw new Error('Erro ao carregar o arquivo GeoJSON.');
    }
    return res.json();
  })
  .then(data => {
    if (!data.features || data.features.length === 0) {
      throw new Error('GeoJSON sem features.');
    }

    var props = data.features[0]?.properties || {};
    var campos = Object.keys(props);


    preencherSelect(campos);

    camada = L.geoJSON(data, {
      style: function (feature) {
        var p = feature.properties || {};
        var categoria = p[campos[0]] ?? 'Sem categoria';

        if (feature.geometry.type === "LineString") {
          return {
            color: "black",
            weight: 5,
            fillColor: getColor(categoria),
            fillOpacity: 0.6
          };

        }
        else {
          return {
            color: "black",
            weight: 1,
            fillColor: getColor(categoria),
            fillOpacity: 0.6
          };
        };

      },

      onEachFeature: function (feature, layer) {
        var p = feature.properties || {};
        var conteudo = '';

        for (let i = 0; i < campos.length; i++) {
          conteudo += '<b>' + campos[i] + '</b> ' + (p[campos[i]] ?? '---') + '<br>';
        }

        layer.bindPopup(conteudo);

      }
    }).addTo(map);

    if (camada.getLayers().length > 0) {
      map.fitBounds(camada.getBounds());
    }



    var legenda = L.control({ position: "bottomright" });

    legenda.onAdd = function () {
      var div = L.DomUtil.create("div", "info legend");
      div.style.background = "white";
      div.style.padding = "10px";
      div.style.border = "1px solid #ccc";
      div.style.font = "14px Arial, sans-serif";

      div.innerHTML = "<b>Legenda</b><br>";

      Object.keys(cores).forEach(function (categoria) {
        div.innerHTML +=
          '<i style="background:' + cores[categoria] +
          '; width:18px; height:18px; display:inline-block; margin-right:5px;"></i>' +
          categoria + "<br>";
      });

      return div;
    };
    if (Object.keys(cores).length < 50) {
      legenda.addTo(map);
    }
  })
  .catch(err => {
    console.error(err);
    alert(err.message);
  });

// busca e da zoom
function buscarEZoom(filtro, valor) {
  var bounds = L.latLngBounds([]);
  var encontrou = false;

  console.log(valor);

  
  camada.eachLayer(function (layer) {
    const element = layer.getElement?.();
     
    //remove a formatação da layer pesquisada
    if (element) {
      element.classList.remove("pesquisado"); 
      layer.setStyle({
        color: null,
        weight: 0
      });
    }


    var props = layer.feature.properties;


    if (props[filtro] && props[filtro].toString().toUpperCase().includes(valor.toUpperCase())) 
    {
      encontrou = true;
        
      if (layer.setStyle) {
        layer.setStyle({
          color: 'red',
          weight: 4
        });
      }
      console.log(layer);

      layer.getElement().classList.add("pesquisado");

      // acumula bounds
      if (layer.getBounds) {
        bounds.extend(layer.getBounds());
      } else if (layer.getLatLng) {
        bounds.extend(layer.getLatLng());
      }
    }
  });

  if (encontrou && bounds.isValid()) {
    map.fitBounds(bounds, {
      padding: [50, 50],
      maxZoom: 22
    });
  }
}

document.getElementById('pesquisar').addEventListener('click', () => {
  var filtro = document.getElementById('filtroMapa').value;
  var valor = document.getElementById('search').value;

  buscarEZoom(filtro, valor);
});

