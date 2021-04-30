//Global volcanic Hotspot search
// 1. Cargar Colecciones
var ST2 = ee.ImageCollection('COPERNICUS/S2');
var L8 = ee.ImageCollection ('LANDSAT/LC08/C01/T1_SR');
var vol = ee.FeatureCollection('users/sergioingeo/Vulcan/GLB_VOLC');
var reventador = vol.filter(ee.Filter.inList('NAME_', ['REVENTADO']));
var point = ee.Geometry.Point(reventador.geometry().coordinates());
var AOI = point.buffer({'distance': 3000});

//2. Filtrar por fecha y área de interés
var S2F =ST2.filterDate('2019-07-01','2019-07-31').filterBounds(AOI)

//3. Calcular NHI
var addIndicesS2 = function(img) {
  // NHISWIR
  var nhiswir = img.normalizedDifference(['B12','B11']).rename('NHISWIR');
  // NHISWNIR 
  var nhiswnir = img.normalizedDifference(['B11','B8A']).rename('NHISWNIR');

  return img
    .addBands(nhiswir)
    .addBands(nhiswnir );
};

//Adicionar índices
var S2= S2F.map(addIndicesS2);

//4. Reducir índices espectrales a un valor promedio

var reduceNHI = function(img) {
  var meanNHI = img.reduceRegion({
    reducer: ee.Reducer.max(),
    geometry: AOI,
    scale: 30,
    bestEffort: true});
  var props = {
    'meanNHI': meanNHI.get('NHISWNIR'),
    'imgID': img.id(),
    'date': img.date().format('YYYY-MM-dd')};
    
  return ee.Feature(AOI, props);
};

//5. Aplicar función y calcular NHI promedio
var S2_NHI = ee.FeatureCollection(S2.select('NHISWNIR').map(reduceNHI));

//6.Exportar resultados
Export.table.toDrive({
  collection: S2_NHI,
  description: 'NHI_reventador',
  folder: 'reduce_region',
  fileFormat: 'CSV'});
