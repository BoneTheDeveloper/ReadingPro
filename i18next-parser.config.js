module.exports = {
  locales: ['vi', 'en'], 

  input: [
    'src/**/*.{js,jsx,ts,tsx}', 
  ],

  output: 'messages/$LOCALE.json',

  keepRemoved: false, 

  createOldCatalogs: false, 
  keySeparator: '.',        
  namespaceSeparator: ':',  
  defaultNamespace: 'translation', 
  lexers: {
    js: ['JsxLexer'],
    ts: ['JsxLexer'],
    jsx: ['JsxLexer'],
    tsx: ['JsxLexer'],
    default: ['JavascriptLexer'],
  },
};