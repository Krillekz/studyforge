/* ==========================================================================
   StudyForge — export helpers (.txt, .md, print-to-PDF)
   No external libraries: the PDF path uses the browser/Electron print dialog.
   ========================================================================== */

(function () {
  const SF = window.SF;
  const ui = SF.ui;

  function toolLabel(tool) {
    return SF.config.toolLabels[tool] || tool || 'Session';
  }

  function metaLine(entry) {
    return 'Tool: ' + toolLabel(entry.tool) + '\nDate: ' + (ui.fmtDateTime(entry.date) || 'unknown');
  }

  function plainBody(entry) {
    const lines = [];
    lines.push(entry.title || 'StudyForge session');
    lines.push('Tool: ' + toolLabel(entry.tool));
    lines.push('Date: ' + (ui.fmtDateTime(entry.date) || ''));
    lines.push('');
    lines.push(new Array(57).join('-'));
    lines.push('');
    (entry.messages || []).forEach(function (m) {
      lines.push(m.role === 'user' ? 'YOU' : 'STUDYFORGE');
      if (m.imageCount) lines.push('[' + m.imageCount + ' image(s) attached]');
      lines.push(m.text || '');
      lines.push('');
      lines.push(new Array(57).join('-'));
      lines.push('');
    });
    lines.push('Generated with StudyForge — ' + SF.config.tagline);
    return lines.join('\n');
  }

  function markdownBody(entry) {
    const lines = [];
    lines.push('# ' + (entry.title || 'StudyForge session'));
    lines.push('');
    lines.push('**' + toolLabel(entry.tool) + '** · ' + (ui.fmtDateTime(entry.date) || ''));
    lines.push('');
    lines.push('---');
    lines.push('');
    (entry.messages || []).forEach(function (m) {
      if (m.role === 'user') {
        lines.push('### You');
        if (m.imageCount) lines.push('> ' + m.imageCount + ' image(s) attached');
        lines.push('');
        lines.push(m.text || '');
        lines.push('');
      } else {
        lines.push('### StudyForge');
        lines.push('');
        lines.push(m.text || '');
        lines.push('');
      }
    });
    lines.push('---');
    lines.push('');
    lines.push('*Generated with StudyForge — ' + SF.config.tagline + '*');
    return lines.join('\n');
  }

  function pdf(title, bodyMarkdown, meta) {
    const css =
      '@page{margin:18mm 16mm}' +
      'body{font-family:-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#151a24;font-size:11.5pt;line-height:1.55;margin:0}' +
      'h1{font-size:20pt;margin:0 0 4px;letter-spacing:-.02em}' +
      '.meta{color:#6b7280;font-size:9.5pt;margin:0 0 18px;padding-bottom:12px;border-bottom:1px solid #e5e7eb}' +
      'h2,h3,h4{font-size:13pt;margin:18px 0 6px}' +
      'h3{font-size:12pt}' +
      'p{margin:0 0 9px}' +
      'ul,ol{margin:6px 0 10px;padding-left:20px}' +
      'li{margin:2px 0}' +
      'code{font-family:Consolas,monospace;background:#f3f4f6;padding:1px 4px;border-radius:3px;font-size:10pt}' +
      'pre{background:#f8f9fb;border:1px solid #e5e7eb;border-radius:6px;padding:10px;overflow-x:auto;font-size:9.5pt;white-space:pre-wrap}' +
      'blockquote{border-left:3px solid #a5b4fc;margin:10px 0;padding:2px 0 2px 12px;color:#4b5563}' +
      'table{border-collapse:collapse;width:100%;font-size:10pt}' +
      'td{border:1px solid #e5e7eb;padding:4px 6px}' +
      'hr{border:0;border-top:1px solid #e5e7eb;margin:14px 0}' +
      'a{color:#4338ca}';

    const html =
      '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + ui.esc(title) + '</title>' +
      '<style>' + css + '</style></head><body>' +
      '<h1>' + ui.esc(title) + '</h1>' +
      (meta ? '<p class="meta">' + ui.esc(meta) + '</p>' : '') +
      '<div>' + ui.md(bodyMarkdown) + '</div>' +
      '</body></html>';

    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    document.body.appendChild(frame);

    const doc = frame.contentWindow && frame.contentWindow.document;
    if (!doc) {
      ui.toast('Could not open the print view.', 'err');
      frame.remove();
      return;
    }
    doc.open();
    doc.write(html);
    doc.close();

    window.setTimeout(function () {
      try {
        frame.contentWindow.focus();
        frame.contentWindow.print();
        ui.toast('Choose “Save as PDF” in the print dialog', 'ok');
      } catch (err) {
        ui.toast('Printing is blocked here — export as .md instead.', 'err');
      }
      window.setTimeout(function () {
        if (frame.parentNode) frame.parentNode.removeChild(frame);
      }, 90000);
    }, 420);
  }

  SF.export = {
    plain: plainBody,
    markdown: markdownBody,
    meta: metaLine,

    sessionText: function (entry) {
      const name = ui.slug(entry.title || toolLabel(entry.tool)) + '.txt';
      ui.downloadFile(name, plainBody(entry), 'text/plain;charset=utf-8');
      ui.toast('Exported ' + name, 'ok');
    },

    sessionMarkdown: function (entry) {
      const name = ui.slug(entry.title || toolLabel(entry.tool)) + '.md';
      ui.downloadFile(name, markdownBody(entry), 'text/markdown;charset=utf-8');
      ui.toast('Exported ' + name, 'ok');
    },

    sessionPdf: function (entry) {
      pdf(entry.title || 'StudyForge session', markdownBody(entry), metaLine(entry));
    },

    /* Export an arbitrary tool output that is not a history entry yet. */
    output: function (title, body, ext) {
      const name = ui.slug(title) + '.' + ext;
      if (ext === 'pdf') {
        pdf(title, body, 'Generated ' + ui.fmtDateTime(new Date().toISOString()));
        return;
      }
      ui.downloadFile(
        name,
        ext === 'md' ? body : '# ' + title + '\n\n' + body,
        ext === 'md' ? 'text/markdown;charset=utf-8' : 'text/plain;charset=utf-8'
      );
      ui.toast('Exported ' + name, 'ok');
    },

    pdf: pdf
  };
})();
