const rectContains = (wrapperRec, childRec) => {
  const { top, left, bottom, right } = wrapperRec.bounds;
  const { x, y } = childRec.bounds;
  return x >= left && x <= right && y >= top && y <= bottom;
};

const byDistanceToTop = (a, b) => {
  return a.y - b.y;
};

miro.onReady(function () {
  miro.initialize({
    extensionPoints: {
      bottomBar: {
        title: 'Unify extract',
        svgIcon:
          '<circle cx="12" cy="12" r="9" fill="none" fill-rule="evenodd" stroke="currentColor" stroke-width="2"/>',
        positionPriority: 1,
        onClick: async () => {
          const authorized = await miro.isAuthorized()
          if (authorized) {
            extractJson()
          } else {
            miro.board.ui.openModal('not-authorized.html').then((res) => {
              if (res === 'success') {
                extractJson()
              }
            })
          }
        }
      },
    }      
  })
})


async function extractJson() {
  // Get all board objects
  const objects = await miro.board.widgets.get()
  // Get all black rectangles
  const blackRecs = objects.filter((object)=> (object.type === "SHAPE") && (object.style.backgroundColor !== "#ffffff") )
  // Get all white rectangles
  const whiteRecs = objects.filter((object)=> (object.type === "SHAPE") && (object.style.backgroundColor === "#ffffff") )
  // Get all text nodes
  const textNodes = objects.filter((object)=> object.type === "TEXT" )

  const canvasObjs = [];

  for (const blackRec of blackRecs) {
    const qas = [];
    const canvasObj = {};
    const containedWhites = whiteRecs
      .filter((whiteRec) => {
        return rectContains(blackRec, whiteRec);
      })
      .sort(byDistanceToTop);
    for (const [index, whiteRec] of containedWhites.entries()) {
      const containedTexts = textNodes
        .filter((textNode) => {
          return rectContains(whiteRec, textNode);
        })
        .sort(byDistanceToTop);
      if (index === 0) {
        canvasObj.title = containedTexts
          .map((text) => {
            return text.plainText;
          })
          .join(' ');
      } else {
        const qa = {
          answer: '',
        };
        for (const [index, text] of containedTexts.entries()) {
          if (index === 0) {
            qa.question = text.plainText;
          } else {
            qa.answer += ' ' + text.plainText;
          }
        }
        qas.push(qa);
      }
    }
    canvasObj.qas = qas;
    canvasObjs.push(canvasObj);
  }
  console.log(canvasObjs);

  var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(canvasObjs));
  var downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download",  "canvas.json");
  document.body.appendChild(downloadAnchorNode); // required for firefox
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
}