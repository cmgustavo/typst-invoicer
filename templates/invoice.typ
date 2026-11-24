// Invoice template. typst-invoicer passes the invoice as JSON through
// `--input data=<json>`; see TemplateData in src/lib/invoice.ts for the shape.
// To customize, copy this file to <data-dir>/template.typ.
#let d = json(bytes(sys.inputs.at("data")))

#let accent = rgb("#1f3a5f")
#let muted = luma(115)
#let rule = luma(215)

#set document(title: "Invoice " + d.number, author: d.from.name)
#set page(
  paper: "us-letter",
  margin: (x: 2.2cm, top: 2.2cm, bottom: 2.4cm),
  footer: [
    #set text(8pt, fill: muted)
    #d.from.name · #d.from.email
    #h(1fr)
    #d.number
  ],
)
#set text(font: ("Inter", "Libertinus Serif"), size: 9.5pt, fill: luma(35))
#set par(leading: 0.6em)

#let label(body) = text(7.5pt, weight: "semibold", fill: muted, tracking: 0.08em, upper(body))
#let lines(arr) = arr.join(linebreak())

// ---------- Header ----------

#grid(
  columns: (1fr, auto),
  align: (left + bottom, right + bottom),
  [
    #text(15pt, weight: "bold", fill: accent, d.from.name) \
    #text(fill: muted)[#lines(d.from.address) \ #d.from.email]
  ],
  [
    #text(26pt, weight: "bold", fill: accent, tracking: 0.04em)[INVOICE] \
    #text(11pt, weight: "medium", d.number)
  ],
)

#v(6pt)
#line(length: 100%, stroke: 1.2pt + accent)
#v(18pt)

// ---------- Bill to / meta ----------

#grid(
  columns: (1fr, auto),
  [
    #label[Bill to] \
    #v(2pt)
    #text(weight: "semibold", d.billTo.name) \
    #lines(d.billTo.address) \
    #text(fill: muted, d.billTo.email)
  ],
  grid(
    columns: (auto, auto),
    column-gutter: 14pt,
    row-gutter: 7pt,
    align: (right, left),
    label[Invoice no.], d.number,
    label[Issue date], d.issueDate,
    label[Due date], d.dueDate,
    label[Terms], d.terms,
  ),
)

#v(26pt)

// ---------- Line items ----------

#table(
  columns: (1fr, auto),
  stroke: none,
  inset: (x: 10pt, y: 10pt),
  fill: (_, y) => if y == 0 { accent },
  table.header(
    text(fill: white, weight: "semibold")[Description],
    align(right, text(fill: white, weight: "semibold")[Amount (#d.currency)]),
  ),
  ..d.items.map(it => (
    [
      #it.description
      #if it.at("detail", default: none) != none [
        \ #text(8pt, fill: muted, it.detail)
      ]
    ],
    align(right, it.amount),
  )).flatten(),
  table.hline(stroke: 0.6pt + rule),
)

#v(6pt)

// ---------- Totals ----------

#align(right, box(width: 48%)[
  #grid(
    columns: (1fr, auto),
    inset: (x: 10pt, y: 6pt),
    align: (left, right),
    text(fill: muted)[Subtotal], d.subtotal,
  )
  #v(2pt)
  #block(
    width: 100%,
    fill: accent.lighten(90%),
    radius: 3pt,
    inset: (x: 10pt, y: 10pt),
    grid(
      columns: (1fr, auto),
      align: (left + horizon, right + horizon),
      text(weight: "semibold")[Balance due],
      text(13pt, weight: "bold", fill: accent, d.total),
    ),
  )
])

// ---------- Notes ----------

#if d.notes.len() > 0 [
  #v(1fr)
  #label[Terms & instructions]
  #v(2pt)
  #line(length: 100%, stroke: 0.6pt + rule)
  #v(2pt)
  #for n in d.notes [#n \ ]
  #text(fill: muted)[Thank you for your business.]
]
