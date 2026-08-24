"use client";

import { useState } from "react";

export default function ProfilePage() {
  const [role, setRole] = useState("majstor");

  return (
    <main className="profilePage">
      <div className="profileCard">
        <h1>Moj profil</h1>
        <p className="profileIntro">
          Uredi svoje podatke i informacije profila.
        </p>

        <div className="roleSwitch">
          <button
            type="button"
            className={role === "majstor" ? "activeRole" : ""}
            onClick={() => setRole("majstor")}
          >
            Majstor
          </button>

          <button
            type="button"
            className={role === "klijent" ? "activeRole" : ""}
            onClick={() => setRole("klijent")}
          >
            Klijent
          </button>
        </div>

        <form className="profileForm">
          <label>
            Ime i prezime
            <input type="text" placeholder="Unesite ime i prezime" />
          </label>

          <label>
            Grad
            <input type="text" placeholder="npr. Split" />
          </label>

          <label>
            Telefon
            <input type="tel" placeholder="+385..." />
          </label>

          {role === "majstor" && (
            <>
              <label>
                Naziv obrta / firme
                <input type="text" placeholder="Naziv obrta ili firme" />
              </label>

              <label>
                Usluge
                <input
                  type="text"
                  placeholder="npr. Soboslikarski radovi, Knauf..."
                />
              </label>

              <label>
                Opis
                <textarea
                  rows="5"
                  placeholder="Kratko predstavite svoje usluge..."
                />
              </label>
            </>
          )}

          <button className="saveProfileButton" type="submit">
            Spremi profil
          </button>
        </form>
      </div>
    </main>
  );
}
