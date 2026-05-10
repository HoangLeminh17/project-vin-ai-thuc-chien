const { getDocument } = require('pdfjs-dist/legacy/build/pdf');
const fs = require('fs');
async function run() {
    const data = new Uint8Array(fs.readFileSync('doc-for-testing/reinforcement_learning.pdf'));
    const pdf = await getDocument({data, verbosity: 0}).promise;
    console.log('Pages:', pdf.numPages);
}
run().catch(console.error);
