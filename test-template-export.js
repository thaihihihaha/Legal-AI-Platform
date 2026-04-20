import('./server/src/services/templateService.js').then(module => {
  console.log('Module loaded');
  console.log('listTemplates is:', typeof module.listTemplates);
  module.listTemplates().then(templates => {
    console.log(`listTemplates() returned ${templates.length} templates:`);
    templates.forEach((t, i) => {
      console.log(`  ${i+1}. ${t.id} - ${t.name} (${t.category})`);
    });
  });
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
