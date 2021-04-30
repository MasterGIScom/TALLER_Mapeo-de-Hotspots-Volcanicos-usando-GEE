//GEE APP para calcular índice NHI y mapeo de Hostpots 
// 1. Cargar Colecciones
var ST2 = ee.ImageCollection('COPERNICUS/S2');
var L8 = ee.ImageCollection ('LANDSAT/LC08/C01/T1_SR');
var vol = ee.FeatureCollection('users/sergioingeo/Vulcan/GLB_VOLC');
var reventador = vol.filter(ee.Filter.inList('NAME_', ['REVENTADO']));
var point = ee.Geometry.Point(reventador.geometry().coordinates());
var AOI = point.buffer({'distance': 3000});
//2. Configuración del mapa
Map.centerObject(AOI,13)
Map.setOptions('satellite')
//3. Preparación de datos Sentinel
//3.1. Creación de una mascara de nubes definiendo la función Mask_Clouds utilizando la banda qa
  // Los Bits 10 y 11 corresponden a sombras y nubes respectivamente 
function maskClouds(image) {
      var cloudBitMask = 1 << 10;
      var cirrusBitMask = 1 << 11;  
    
    // Seleccion de la banda QA.
    var qa = image.select('QA60');
    
     // Ambas máscaras son convertidas a valores de 0.
    var mask = qa.bitwiseAnd(cloudBitMask).eq(0).and(qa.bitwiseAnd(cirrusBitMask).eq(0)); 
  
  // Convertir la imagen a valores de 0 a 1 [0, 1].
  return image.updateMask(mask).divide(10000).copyProperties(image, ["system:time_start"]);
}
//3.1. Calculo de índices espectrales
var addIndicesS2 = function(img) {
  // NHISWIR
  var nhiswir = img.normalizedDifference(['B12','B11']).rename('NHISWIR');
  // NHISWNIR 
  var nhiswnir = img.normalizedDifference(['B11','B8A']).rename('NHISWNIR');

  return img
    .addBands(nhiswir)
    .addBands(nhiswnir );
};
//3.2 Aplicar filtros y mascaras a la colección Sentinel
var S2F=ST2.filterDate('2019-07-10','2019-07-12')
    .filterBounds(AOI)
//Aplicar mascara de nubes
var S2G = S2F   
    .map(maskClouds)
    .map(addIndicesS2);
var S2 = ee.Image(S2G.sort('CLOUD_COVERAGE_ASSESSMENT').first()); 
//3.3 Crear un raster de anomalías terkales con bandas 
  //NHISWIR y NHISWNIR 

var compositeNew = S2
var NHI = compositeNew.expression(
    "(b('NHISWNIR') > 0.5) ? 1" +
      ": (b('NHISWIR') > 0.5) ? 2" +
          ":0"
);
//Aplicar una mascara para eliminar valores nulos
var mask = NHI.neq(0)
var NHI = NHI.updateMask(mask);

//4.Visualización
//4.1 Fondo, RGB penetración atmosferica
var BG= S2F.sort('CLOUD_COVERAGE_ASSESSMENT').first().divide(10000).clip(AOI);
var visparams = {bands: ['B12','B11','B8A'], min:0 , max:0.4 ,gamma:0.5};

//Adicionar anomalías e imagen de fondo
Map.addLayer(BG, visparams, "Atmospheric Penetration" );
Map.addLayer(NHI,  {palette: ['F00A0A','FFEB3C'], min:1, max:2}, "NHISWNIR" );

//4.2 Crear un recuadro de leyenda
// Establecer la posición del panel 
var legend = ui.Panel({
  style: {
    position: 'bottom-left',
    padding: '8px 15px'
  }
});
 
//Crear título de leyenda 
var legendTitle = ui.Label({
  value: 'NHI',
  style: {
    fontWeight: 'bold',
    fontSize: '18px',
    margin: '0 0 4px 0',
    padding: '0'
    }
});
 
//Adicionar el título al panel
legend.add(legendTitle);
 
//Crear y aplicar estilo de 1 fila de la leyenda. 
var makeRow = function(color, name) {
 
      //Crear la etiqueta que en realidad es el cuadro de color.
      var colorBox = ui.Label({
        style: {
          backgroundColor: '#' + color,
          padding: '8px',
          margin: '0 0 4px 0'
        }
      });
 
      // Crear la etiqueta con el texto de descripción.
      var description = ui.Label({
        value: name,
        style: {margin: '0 0 4px 6px'}
      });
 
      return ui.Panel({
        widgets: [colorBox, description],
        layout: ui.Panel.Layout.Flow('horizontal')
      });
};
 
//Paleta de Colores
var palette =['F00A0A','FFEB3C'];
 
//Nombres de la leyenda
var names = ['High Intensity Pixels','Mid-Low Intensity Pixels'];
 
//Adicionar colores y nombre
for (var i = 0; i < 2; i++) {
  legend.add(makeRow(palette[i], names[i]));
  }  
 
//Adicionar leyenda al mapa
Map.add(legend);
