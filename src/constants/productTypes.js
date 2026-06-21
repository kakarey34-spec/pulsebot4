const PRODUCT_TYPES = {
  script: { label: 'Script', forumId: '1517822587533791292' },
  cars: { label: 'Cars', forumId: '1517822757088264373' },
  build: { label: 'Build', forumId: '1517822699282370581' },
};

function getProductType(type) {
  return PRODUCT_TYPES[type] || null;
}

function productTypeChoices() {
  return Object.entries(PRODUCT_TYPES).map(([value, { label }]) => ({ name: label, value }));
}

module.exports = { PRODUCT_TYPES, getProductType, productTypeChoices };
