// The module hubs' cards (/demos/ and /docs/; owner 2026-11-24: one dark card family, but each hub shows what you get).
// /demos/: the module's picture (site-src/docs.json art) with a small app window overlapping its lower edge, showing a
// few lines of one of the module's real panels, word for word from the extraction. /docs/: a miniature docs page whose
// sidebar holds the module's real docs group labels. Used by scripts/build-demos.mjs and scripts/build-docs.mjs.
const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
const bare = (s) =>
  String(s ?? '')
    .replace(/[⟦⟧☑☐‹›«»]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

// a few real lines per module: Goten's bank lines (G4, rows 1–3: amount, payer, status), Trunks' cases (T1: its title,
// count, and the first three cases' subject and risk), Bulma's deal parts (A4: the first three and their state); a module
// without a demo yet gets the same window, empty
function windowOf(id, data) {
  if (id === 'goten') {
    const g4 = data.scenes.G4
    return `<span class="hub-win__bar"><span>${esc(g4.head)}</span></span>${g4.wide
      .slice(1, 4)
      .map((r) => {
        const status = bare(r[4])
        const on = status === 'Needs review' ? ' hub-win__row--on' : ''
        return `<span class="hub-win__row hub-win__row--3${on}"><span class="hub-num">${esc(r[1])}</span><span class="hub-cut">${esc(r[2])}</span><span class="hub-tag">${esc(status)}</span></span>`
      })
      .join('')}`
  }
  if (id === 'trunks') {
    const t1 = data.scenes.T1.wide
    const cases = t1.flatMap((l, i) => (l === '→' ? [{ subject: t1[i - 1], risk: t1[i + 3] }] : [])).slice(0, 3)
    return `<span class="hub-win__bar"><span>${esc(t1[1])}</span><span class="hub-win__meta">${esc(t1[2])}</span></span>${cases
      .map(
        (c, i) =>
          `<span class="hub-win__row hub-win__row--2${i === 0 ? ' hub-win__row--on' : ''}"><span class="hub-cut">${esc(c.subject)}</span><span class="hub-tag">${esc(c.risk)}</span></span>`,
      )
      .join('')}`
  }
  if (id === 'bulma') {
    const a4 = data.scenes.A4
    return `<span class="hub-win__bar"><span>${esc(a4.head)}</span></span>${[0, 2, 4]
      .map(
        (i) =>
          `<span class="hub-win__row hub-win__row--2${bare(a4.wide[i]) === 'Terms' ? ' hub-win__row--on' : ''}"><span class="hub-cut">${esc(bare(a4.wide[i]))}</span><span class="hub-tag">${esc(bare(a4.wide[i + 1]))}</span></span>`,
      )
      .join('')}`
  }
  return `<span class="hub-win__bar"></span>${'<span class="hub-win__row hub-win__row--skel"><i></i><i></i></span>'.repeat(3)}`
}

export function demoHubCards(docs, products) {
  return docs.products
    .map((d, i) => {
      const m = products.find((x) => x.id === d.id)
      const label = ` aria-labelledby="hub-${d.id}-n hub-${d.id}-k"`
      // the first card sits above the fold on a phone: its picture loads at once
      const lazy = i === 0 ? '' : ' loading="lazy"'
      const inner = `<span class="hub-stage" aria-hidden="true"><img class="docs-card__art" src="/media/blog/${d.art}.webp" alt="" width="904" height="1130"${lazy} decoding="async" /><span class="hub-win">${windowOf(d.id, m?.data)}</span></span><strong id="hub-${d.id}-n">${esc(d.name)}</strong><span id="hub-${d.id}-k">${esc(d.role)}</span>${
        m ? `<span class="docs-card__groups">${m.spec.needs.map((n) => esc(n.nav)).join('&nbsp;· ')}</span>` : ''
      }<span class="hub-foot"><small>${m ? esc(d.version) : 'Upcoming'}</small>${m ? '<span class="hub-cta">See the demo <span class="arrow" aria-hidden="true">→</span></span>' : ''}</span>`
      return m
        ? `<a class="docs-card hub-card hub-card--demo docs-card--${d.id}" href="/demos/${d.id}/"${label}>${inner}</a>`
        : `<div class="docs-card hub-card hub-card--demo docs-card--off docs-card--${d.id}">${inner}</div>`
    })
    .join('\n')
}

export function docHubCards(docs) {
  return docs.products
    .map((p) => {
      const groups = p.groups.filter((g) => g.items.some((i) => i.route))
      const home = groups.flatMap((g) => g.items).find((i) => i.route)
      // one bar per page in a group (at most two; the third group one); the first bar of the first group is the page shown
      const side = groups
        .map(
          (g, gi) =>
            `<span class="hub-side__g"><span class="hub-side__l">${esc(g.label)}</span>${g.items
              .filter((i) => i.route)
              .slice(0, gi === 2 ? 1 : 2)
              .map((_, ii) => `<i${gi === 0 && ii === 0 ? ' class="hub-on"' : ''}></i>`)
              .join('')}</span>`,
        )
        .join('')
      if (!home) return `<div class="docs-card docs-card--off docs-card--${p.id}"><strong>${esc(p.name)}</strong><span>${esc(p.role)}</span></div>`
      const page = `<span class="hub-page"><span class="hub-win__bar"><span>${esc(home.route)}</span></span><span class="hub-page__body"><span class="hub-side">${side}</span><span class="hub-text"><i class="hub-h"></i><i></i><i></i><i></i><i class="hub-short"></i><i class="hub-code"></i><i></i><i></i></span></span></span>`
      const inner = `<span class="hub-stage hub-stage--doc" aria-hidden="true">${page}</span><strong id="hubd-${p.id}-n">${esc(p.name)}</strong><span id="hubd-${p.id}-k">${esc(p.role)}</span><span class="hub-foot"><small>${esc(p.version)}</small><span class="hub-cta">Read the docs <span class="arrow" aria-hidden="true">→</span></span></span>`
      return `<a class="docs-card hub-card hub-card--doc docs-card--${p.id}" href="${home.route}" aria-labelledby="hubd-${p.id}-n hubd-${p.id}-k">${inner}</a>`
    })
    .join('\n')
}
