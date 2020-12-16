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
          const authorized = await miro.isAuthorized();
          if (authorized) {
            extractJson();
          } else {
            miro.board.ui.openModal('not-authorized.html').then((res) => {
              if (res === 'success') {
                extractJson();
              }
            });
          }
        },
      },
    },
  });
});

async function extractJson() {
  // Get all board objects
  const objects = await miro.board.widgets.get();
  // Get all black rectangles
  const canvasWrapperRects = objects.filter(
    (object) =>
      object.type === 'SHAPE' && object.style.backgroundColor !== '#ffffff',
  );
  // Get line seperator
  const seperator = objects
    .filter((obj) => {
      return obj.type === 'LINE';
    })
    .sort((a, b) => {
      return b.bounds.height - a.bounds.height;
    })[0];
  // Original canvases
  const originals = canvasWrapperRects.filter((rec) => {
    return rec.bounds.x < seperator.bounds.x;
  });
  // Copied canvases
  const copies = canvasWrapperRects.filter((rec) => {
    return rec.bounds.x > seperator.bounds.x;
  });
  // Get all white rectangles
  const questionWrapperRects = objects.filter(
    (object) =>
      object.type === 'SHAPE' && object.style.backgroundColor === '#ffffff',
  );
  // Get all text nodes
  const textNodes = objects.filter((object) => object.type === 'TEXT');

  const canvasObjs = [];

  for (const canvasWrapper of canvasWrapperRects) {
    const qas = [];
    const canvasObj = {};
    const containedWhites = questionWrapperRects
      .filter((questionWrapper) => {
        return rectContains(canvasWrapper, questionWrapper);
      })
      .sort(byDistanceToTop);
    for (const [index, questionWrapper] of containedWhites.entries()) {
      const containedTexts = textNodes
        .filter((textNode) => {
          return rectContains(questionWrapper, textNode);
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

  for (const canvasWrapper of originals) {
    const containedWhites = questionWrapperRects
      .filter((questionWrapper) => {
        return rectContains(canvasWrapper, questionWrapper);
      })
      .sort(byDistanceToTop);
    const canvasHeadingWrapper = containedWhites[0];

    const containedTexts = textNodes
      .filter((textNode) => {
        return rectContains(canvasHeadingWrapper, textNode);
      })
      .sort(byDistanceToTop);
    const heading = containedTexts
      .map((text) => {
        return text.plainText;
      })
      .join(' ');
    for (const canvas of canvasObjs) {
      if (canvas.title === heading) {
        canvas.createdBy = containedTexts[0].createdUserId;
      }
    }
  }

  var dataStr =
    'data:text/json;charset=utf-8,' +
    encodeURIComponent(JSON.stringify(canvasObjs, null, 2));
  var downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute('href', dataStr);
  downloadAnchorNode.setAttribute('download', 'canvas.json');
  document.body.appendChild(downloadAnchorNode); // required for firefox
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
}
