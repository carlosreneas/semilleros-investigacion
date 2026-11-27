package com.semilleros.backend.service;

import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;
import org.xml.sax.SAXException;

import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;
import javax.xml.transform.OutputKeys;
import javax.xml.transform.Transformer;
import javax.xml.transform.TransformerException;
import javax.xml.transform.TransformerFactory;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamResult;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;
import java.util.function.Consumer;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import java.util.zip.ZipOutputStream;

/**
 * Utilidad para rellenar plantillas Word (.docx) institucionales sin perder su formato.
 *
 * <p>Edita únicamente {@code word/document.xml} y copia el resto de partes del archivo tal cual
 * (encabezados, logo, estilos, protección del documento). Rellena los controles que usan las plantillas
 * de la universidad en lugar de reemplazarlos por texto fijo, para que el documento siga siendo editable:
 * campos de formulario clásicos ({@code FORMTEXT}), controles de contenido de fecha y lista desplegable,
 * y casillas de verificación.</p>
 */
final class DocxFormEditor {

    private static final String W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
    private static final String W14_NS = "http://schemas.microsoft.com/office/word/2010/wordml";
    private static final String XML_NS = "http://www.w3.org/XML/1998/namespace";
    private static final String DOCUMENT_ENTRY = "word/document.xml";

    private static final String CHECKED_SYMBOL = "☒";   // ☒
    private static final String UNCHECKED_SYMBOL = "☐"; // ☐
    private static final DateTimeFormatter DISPLAY_DATE = DateTimeFormatter.ofPattern("d/MM/yyyy");

    private final Document dom;
    private final Set<Long> usedSdtIds = new HashSet<>();

    private DocxFormEditor(Document dom) {
        this.dom = dom;
        for (Element id : descendants(dom.getDocumentElement(), "id")) {
            String value = id.getAttributeNS(W_NS, "val");
            if (!value.isEmpty() && id.getParentNode() instanceof Element parent && "sdtPr".equals(parent.getLocalName())) {
                try {
                    usedSdtIds.add(Long.parseLong(value));
                } catch (NumberFormatException ignored) {
                    // identificador no numérico: no participa en la verificación de unicidad
                }
            }
        }
    }

    /**
     * Abre un .docx, permite modificar su {@code word/document.xml} y devuelve el .docx resultante.
     */
    static byte[] edit(InputStream docx, Consumer<DocxFormEditor> editor) throws IOException {
        Map<String, byte[]> entries = new LinkedHashMap<>();
        try (ZipInputStream zin = new ZipInputStream(docx)) {
            ZipEntry entry;
            while ((entry = zin.getNextEntry()) != null) {
                if (!entry.isDirectory()) {
                    entries.put(entry.getName(), zin.readAllBytes());
                }
            }
        }

        byte[] documentXml = entries.get(DOCUMENT_ENTRY);
        if (documentXml == null) {
            throw new IOException("La plantilla no contiene " + DOCUMENT_ENTRY);
        }

        Document dom = parse(documentXml);
        editor.accept(new DocxFormEditor(dom));
        entries.put(DOCUMENT_ENTRY, serialize(dom));

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (ZipOutputStream zout = new ZipOutputStream(out)) {
            for (Map.Entry<String, byte[]> e : entries.entrySet()) {
                zout.putNextEntry(new ZipEntry(e.getKey()));
                zout.write(e.getValue());
                zout.closeEntry();
            }
        }
        return out.toByteArray();
    }

    // ------------------------------------------------------------------ navegación

    /** Tablas del cuerpo del documento, en orden de aparición. */
    List<Element> tables() {
        Element body = child(dom.getDocumentElement(), "body");
        return body == null ? List.of() : children(body, "tbl");
    }

    List<Element> rows(Element table) {
        return children(table, "tr");
    }

    /** Celdas de una fila, incluidas las que están envueltas en un control de contenido (fecha, lista...). */
    List<Element> cells(Element row) {
        List<Element> cells = new ArrayList<>();
        for (Node n = row.getFirstChild(); n != null; n = n.getNextSibling()) {
            if (!(n instanceof Element e) || !W_NS.equals(e.getNamespaceURI())) {
                continue;
            }
            if ("tc".equals(e.getLocalName())) {
                cells.add(e);
            } else if ("sdt".equals(e.getLocalName())) {
                Element content = child(e, "sdtContent");
                if (content != null) {
                    cells.addAll(children(content, "tc"));
                }
            }
        }
        return cells;
    }

    // ------------------------------------------------------------------ edición

    /**
     * Escribe texto en una celda editable: campo de formulario {@code FORMTEXT} o control de contenido
     * (lista desplegable). Si el texto es nulo o vacío, la celda queda como está en la plantilla.
     */
    void setText(Element cell, String text) {
        if (text == null || text.isBlank()) {
            return;
        }
        Element sdt = enclosingSdt(cell);
        if (sdt != null) {
            fillContentControl(cell, sdt, text);
        } else if (descendants(cell, "instrText").stream().anyMatch(i -> i.getTextContent().contains("FORMTEXT"))) {
            fillFormField(cell, text);
        } else {
            throw new IllegalStateException("La celda de la plantilla no es un campo editable");
        }
    }

    /** Escribe una fecha en una celda con control de contenido de tipo fecha. */
    void setDate(Element cell, LocalDate date) {
        if (date == null) {
            return;
        }
        Element sdt = enclosingSdt(cell);
        Element dateNode = sdt != null ? child(child(sdt, "sdtPr"), "date") : null;
        if (dateNode == null) {
            throw new IllegalStateException("La celda de la plantilla no es un selector de fecha");
        }
        dateNode.setAttributeNS(W_NS, "w:fullDate", date + "T00:00:00Z");
        fillContentControl(cell, sdt, DISPLAY_DATE.format(date));
    }

    /** Marca o desmarca la casilla número {@code index} (base 0) dentro de la celda. */
    void setChecked(Element cell, int index, boolean checked) {
        List<Element> boxes = new ArrayList<>();
        for (Element sdt : descendants(cell, "sdt")) {
            Element pr = child(sdt, "sdtPr");
            if (pr != null && firstChildNs(pr, W14_NS, "checkbox") != null) {
                boxes.add(sdt);
            }
        }
        if (index >= boxes.size()) {
            throw new IllegalStateException("La celda de la plantilla no tiene la casilla " + index);
        }
        Element sdt = boxes.get(index);
        Element checkbox = firstChildNs(child(sdt, "sdtPr"), W14_NS, "checkbox");
        Element state = firstChildNs(checkbox, W14_NS, "checked");
        if (state != null) {
            state.setAttributeNS(W14_NS, "w14:val", checked ? "1" : "0");
        }
        List<Element> runs = descendants(child(sdt, "sdtContent"), "r");
        if (!runs.isEmpty()) {
            Element run = runs.get(0);
            replaceRunText(run, checked ? CHECKED_SYMBOL : UNCHECKED_SYMBOL);
            Element rPr = ensureChildFirst(run, "rPr");
            Element fonts = child(rPr, "rFonts");
            if (fonts == null) {
                fonts = dom.createElementNS(W_NS, "w:rFonts");
                rPr.insertBefore(fonts, rPr.getFirstChild());
            }
            for (String attr : new String[]{"ascii", "hAnsi", "eastAsia", "cs"}) {
                fonts.setAttributeNS(W_NS, "w:" + attr, "MS Gothic");
            }
        }
    }

    /**
     * Garantiza que la tabla tenga al menos {@code needed} filas de datos a partir de {@code firstDataRow}
     * (base 0), clonando la última fila (que debe estar vacía) con su formato.
     */
    void ensureDataRows(Element table, int firstDataRow, int needed) {
        List<Element> rows = rows(table);
        int available = rows.size() - firstDataRow;
        Element last = rows.get(rows.size() - 1);
        while (available < needed) {
            last = cloneRowAfter(last);
            available++;
        }
    }

    /**
     * Convierte una tabla flotante (posicionada respecto a un párrafo) en una tabla en línea.
     * Las tablas flotantes no se reparten bien entre páginas cuando crecen con el contenido: el bloque
     * siguiente puede quedar cortado y la numeración automática de las secciones se desordena.
     */
    void makeInline(Element table) {
        Element properties = child(table, "tblPr");
        Element floating = child(properties, "tblpPr");
        if (floating != null) {
            properties.removeChild(floating);
        }
    }

    // ------------------------------------------------------------------ internos

    private Element cloneRowAfter(Element row) {
        Element copy = (Element) row.cloneNode(true);

        List<Element> all = new ArrayList<>();
        all.add(copy);
        NodeList nodes = copy.getElementsByTagName("*");
        for (int i = 0; i < nodes.getLength(); i++) {
            all.add((Element) nodes.item(i));
        }

        List<Element> bookmarks = new ArrayList<>();
        for (Element e : all) {
            // Los identificadores de párrafo y los marcadores deben ser únicos en el documento
            e.removeAttributeNS(W14_NS, "paraId");
            e.removeAttributeNS(W14_NS, "textId");
            if (W_NS.equals(e.getNamespaceURI())) {
                String name = e.getLocalName();
                if ("bookmarkStart".equals(name) || "bookmarkEnd".equals(name)) {
                    bookmarks.add(e);
                } else if ("sdtPr".equals(name)) {
                    Element id = child(e, "id");
                    if (id != null) {
                        id.setAttributeNS(W_NS, "w:val", String.valueOf(newSdtId()));
                    }
                }
            }
        }
        for (Element bookmark : bookmarks) {
            bookmark.getParentNode().removeChild(bookmark);
        }

        row.getParentNode().insertBefore(copy, row.getNextSibling());
        return copy;
    }

    private long newSdtId() {
        long id;
        do {
            id = ThreadLocalRandom.current().nextLong(1, Integer.MAX_VALUE);
        } while (!usedSdtIds.add(id));
        return id;
    }

    private Element enclosingSdt(Element cell) {
        Node parent = cell.getParentNode();
        if (parent instanceof Element content && W_NS.equals(content.getNamespaceURI())
                && "sdtContent".equals(content.getLocalName())
                && content.getParentNode() instanceof Element sdt && "sdt".equals(sdt.getLocalName())) {
            return sdt;
        }
        return null;
    }

    /** Rellena un control de contenido (fecha / lista desplegable) reemplazando el texto de marcador. */
    private void fillContentControl(Element cell, Element sdt, String text) {
        Element pr = child(sdt, "sdtPr");
        Element placeholder = child(pr, "showingPlcHdr");
        if (placeholder != null) {
            pr.removeChild(placeholder);
        }

        Element paragraph = descendants(cell, "p").get(0);
        List<Element> runs = children(paragraph, "r");
        Element run;
        if (runs.isEmpty()) {
            run = dom.createElementNS(W_NS, "w:r");
            paragraph.appendChild(run);
        } else {
            run = runs.get(0);
            for (int i = 1; i < runs.size(); i++) {
                paragraph.removeChild(runs.get(i));
            }
        }
        // El estilo "Texto del marcador de posición" pinta el texto en gris: se quita al poner contenido real
        Element rPr = child(run, "rPr");
        if (rPr != null) {
            Element style = child(rPr, "rStyle");
            if (style != null) {
                rPr.removeChild(style);
            }
        }
        replaceRunText(run, text);
    }

    /** Rellena un campo de formulario clásico: reemplaza los runs entre "separate" y "end" del campo. */
    private void fillFormField(Element cell, String text) {
        Element paragraph = descendants(cell, "p").get(0);

        Element separate = null;
        Element end = null;
        for (Element run : children(paragraph, "r")) {
            Element fldChar = child(run, "fldChar");
            if (fldChar == null) {
                continue;
            }
            String type = fldChar.getAttributeNS(W_NS, "fldCharType");
            if ("separate".equals(type) && separate == null) {
                separate = run;
            } else if ("end".equals(type) && separate != null) {
                end = run;
                break;
            }
        }
        if (separate == null || end == null) {
            throw new IllegalStateException("El campo de formulario de la plantilla está incompleto");
        }

        Element rPrSource = null;
        List<Node> previousResult = new ArrayList<>();
        for (Node n = separate.getNextSibling(); n != null && n != end; n = n.getNextSibling()) {
            if (n instanceof Element e && W_NS.equals(e.getNamespaceURI()) && "r".equals(e.getLocalName())) {
                if (rPrSource == null) {
                    rPrSource = child(e, "rPr");
                }
                previousResult.add(e);
            }
        }
        for (Node n : previousResult) {
            paragraph.removeChild(n);
        }
        if (rPrSource == null) {
            rPrSource = child(separate, "rPr");
        }

        Element run = dom.createElementNS(W_NS, "w:r");
        if (rPrSource != null) {
            run.appendChild(rPrSource.cloneNode(true));
        }
        appendText(run, text);
        paragraph.insertBefore(run, end);
    }

    private void replaceRunText(Element run, String text) {
        for (Element t : children(run, "t")) {
            run.removeChild(t);
        }
        for (Element br : children(run, "br")) {
            run.removeChild(br);
        }
        appendText(run, text);
    }

    private void appendText(Element run, String text) {
        String[] lines = sanitize(text).split("\\R", -1);
        for (int i = 0; i < lines.length; i++) {
            if (i > 0) {
                run.appendChild(dom.createElementNS(W_NS, "w:br"));
            }
            Element t = dom.createElementNS(W_NS, "w:t");
            t.setAttributeNS(XML_NS, "xml:space", "preserve");
            t.setTextContent(lines[i]);
            run.appendChild(t);
        }
    }

    /** Elimina caracteres de control que no son válidos en XML 1.0. */
    private static String sanitize(String text) {
        return text.replaceAll("[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F]", "");
    }

    private Element ensureChildFirst(Element parent, String localName) {
        Element existing = child(parent, localName);
        if (existing != null) {
            return existing;
        }
        Element created = dom.createElementNS(W_NS, "w:" + localName);
        parent.insertBefore(created, parent.getFirstChild());
        return created;
    }

    // ------------------------------------------------------------------ utilidades DOM

    private static List<Element> children(Node parent, String localName) {
        List<Element> result = new ArrayList<>();
        if (parent == null) {
            return result;
        }
        for (Node n = parent.getFirstChild(); n != null; n = n.getNextSibling()) {
            if (n instanceof Element e && W_NS.equals(e.getNamespaceURI()) && localName.equals(e.getLocalName())) {
                result.add(e);
            }
        }
        return result;
    }

    private static Element child(Node parent, String localName) {
        List<Element> found = children(parent, localName);
        return found.isEmpty() ? null : found.get(0);
    }

    private static Element firstChildNs(Node parent, String ns, String localName) {
        if (parent == null) {
            return null;
        }
        for (Node n = parent.getFirstChild(); n != null; n = n.getNextSibling()) {
            if (n instanceof Element e && ns.equals(e.getNamespaceURI()) && localName.equals(e.getLocalName())) {
                return e;
            }
        }
        return null;
    }

    private static List<Element> descendants(Element root, String localName) {
        List<Element> result = new ArrayList<>();
        if (root == null) {
            return result;
        }
        NodeList nodes = root.getElementsByTagNameNS(W_NS, localName);
        for (int i = 0; i < nodes.getLength(); i++) {
            result.add((Element) nodes.item(i));
        }
        return result;
    }

    private static Document parse(byte[] xml) throws IOException {
        try {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            factory.setNamespaceAware(true);
            factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
            factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
            factory.setXIncludeAware(false);
            factory.setExpandEntityReferences(false);
            return factory.newDocumentBuilder().parse(new ByteArrayInputStream(xml));
        } catch (ParserConfigurationException | SAXException e) {
            throw new IOException("No se pudo leer el contenido de la plantilla Word: " + e.getMessage(), e);
        }
    }

    private static byte[] serialize(Document dom) throws IOException {
        try {
            dom.setXmlStandalone(true);
            TransformerFactory factory = TransformerFactory.newInstance();
            factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_DTD, "");
            factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_STYLESHEET, "");
            Transformer transformer = factory.newTransformer();
            transformer.setOutputProperty(OutputKeys.ENCODING, "UTF-8");
            transformer.setOutputProperty(OutputKeys.INDENT, "no");
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            transformer.transform(new DOMSource(dom), new StreamResult(out));
            return out.toByteArray();
        } catch (TransformerException e) {
            throw new IOException("No se pudo escribir el contenido del documento Word: " + e.getMessage(), e);
        }
    }
}
