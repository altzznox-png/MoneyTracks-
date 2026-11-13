(() => {
  const STORAGE_KEY = "moneytrack:transaksi";

  const KATEGORI = {
    keluar: ["Makan", "Transportasi", "Belanja", "Tagihan", "Hiburan", "Kesehatan", "Lainnya"],
    masuk: ["Gaji", "Bonus", "Usaha", "Hadiah", "Lainnya"],
  };

  const rupiah = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  });

  const $ = (id) => document.getElementById(id);
  const el = {
    form: $("form"),
    nominal: $("nominal"),
    tanggal: $("tanggal"),
    kategori: $("kategori"),
    keterangan: $("keterangan"),
    filter: $("filterBulan"),
    saldo: $("saldo"),
    totalMasuk: $("totalMasuk"),
    totalKeluar: $("totalKeluar"),
    barMasuk: $("barMasuk"),
    barKeluar: $("barKeluar"),
    kategoriList: $("kategoriList"),
    riwayat: $("riwayat"),
  };

  let data = load();

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      return [];
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      console.error("Gagal menyimpan data:", err);
    }
  }

  function hariIni() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function jenisTerpilih() {
    return el.form.elements.jenis.value;
  }

  function isiKategori() {
    el.kategori.replaceChildren(
      ...KATEGORI[jenisTerpilih()].map((nama) => new Option(nama, nama))
    );
  }

  function formatTanggal(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function buatItem(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function render() {
    const bulan = el.filter.value;
    const terfilter = data
      .filter((t) => t.tanggal.startsWith(bulan))
      .sort((a, b) => b.tanggal.localeCompare(a.tanggal) || b.id - a.id);

    const masuk = terfilter.filter((t) => t.jenis === "masuk").reduce((s, t) => s + t.nominal, 0);
    const keluar = terfilter.filter((t) => t.jenis === "keluar").reduce((s, t) => s + t.nominal, 0);

    el.saldo.textContent = rupiah.format(masuk - keluar);
    el.totalMasuk.textContent = rupiah.format(masuk);
    el.totalKeluar.textContent = rupiah.format(keluar);

    const total = masuk + keluar;
    el.barMasuk.style.width = total ? `${(masuk / total) * 100}%` : "0";
    el.barKeluar.style.width = total ? `${(keluar / total) * 100}%` : "0";

    renderKategori(terfilter, keluar);
    renderRiwayat(terfilter);
  }

  function renderKategori(items, totalKeluar) {
    const perKategori = {};
    items
      .filter((t) => t.jenis === "keluar")
      .forEach((t) => {
        perKategori[t.kategori] = (perKategori[t.kategori] || 0) + t.nominal;
      });

    const urut = Object.entries(perKategori).sort((a, b) => b[1] - a[1]);

    if (!urut.length) {
      el.kategoriList.replaceChildren(buatItem("p", "empty", "Belum ada pengeluaran di bulan ini."));
      return;
    }

    el.kategoriList.replaceChildren(
      ...urut.map(([nama, jumlah]) => {
        const li = buatItem("li");
        const head = buatItem("div", "cat-head");
        head.append(buatItem("span", "", nama), buatItem("span", "", rupiah.format(jumlah)));
        const track = buatItem("div", "cat-track");
        const fill = buatItem("div", "cat-fill");
        fill.style.width = `${(jumlah / totalKeluar) * 100}%`;
        track.append(fill);
        li.append(head, track);
        return li;
      })
    );
  }

  function renderRiwayat(items) {
    if (!items.length) {
      el.riwayat.replaceChildren(buatItem("p", "empty", "Belum ada transaksi. Catat yang pertama di atas."));
      return;
    }

    el.riwayat.replaceChildren(
      ...items.map((t) => {
        const li = buatItem("li");

        const info = buatItem("div");
        info.append(
          buatItem("div", "h-title", t.keterangan || t.kategori),
          buatItem("div", "h-meta", `${t.kategori}, ${formatTanggal(t.tanggal)}`)
        );

        const tanda = t.jenis === "masuk" ? "+" : "-";
        const amount = buatItem("div", `h-amount ${t.jenis === "masuk" ? "in" : "out"}`, `${tanda}${rupiah.format(t.nominal)}`);

        const del = buatItem("button", "del", "×");
        del.type = "button";
        del.setAttribute("aria-label", `Hapus transaksi ${t.keterangan || t.kategori}`);
        del.addEventListener("click", () => hapus(t.id));

        li.append(info, amount, del);
        return li;
      })
    );
  }

  function hapus(id) {
    data = data.filter((t) => t.id !== id);
    save();
    render();
  }

  el.form.addEventListener("submit", (e) => {
    e.preventDefault();
    const nominal = Math.round(Number(el.nominal.value));
    if (!nominal || nominal < 1) return;

    data.push({
      id: Date.now(),
      jenis: jenisTerpilih(),
      nominal,
      tanggal: el.tanggal.value,
      kategori: el.kategori.value,
      keterangan: el.keterangan.value.trim(),
    });
    save();

    // Tampilkan bulan transaksi yang baru dicatat
    el.filter.value = el.tanggal.value.slice(0, 7);

    el.nominal.value = "";
    el.keterangan.value = "";
    el.nominal.focus();
    render();
  });

  el.form.querySelectorAll('input[name="jenis"]').forEach((r) =>
    r.addEventListener("change", isiKategori)
  );
  el.filter.addEventListener("change", () => {
    if (!el.filter.value) el.filter.value = hariIni().slice(0, 7);
    render();
  });

  el.tanggal.value = hariIni();
  el.filter.value = hariIni().slice(0, 7);
  isiKategori();
  render();
})();if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch((err) => {
      console.error("Service worker gagal didaftarkan:", err);
    });
  });
}  el.tanggal.value = hariIni();
  el.filter.value = hariIni().slice(0, 7);
  isiKategori();
  render();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch((err) => {
      console.error("Service worker gagal didaftarkan:", err);
    });
  });
}