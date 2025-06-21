<template>
  <div class="event-admin">
    <h1>Gestion des événements du samedi</h1>

    <!-- ─── Formulaire création / édition ─────────────────────────────── -->
    <form class="form" @submit.prevent="onSubmit">
      <input v-model="form.title" placeholder="Titre" required />
      <textarea v-model="form.description" placeholder="Description (option)" rows="2" />

      <label>
        Date (samedi)
        <input type="date" v-model="form.date" required />
      </label>
      <label>
        Début
        <input type="time" v-model="form.startTime" required />
      </label>
      <label>
        Fin
        <input type="time" v-model="form.endTime" required />
      </label>

      <label>
        Prix (€ – 0 = gratuit)
        <input type="number" min="0" step="0.01" v-model.number="form.price" />
      </label>
      <label>
        Capacité (option)
        <input type="number" min="1" v-model.number="form.capacity" />
      </label>

      <input type="file" accept="image/*" @change="onFile" />

      <div class="actions">
        <button type="submit">{{ editingId ? 'Mettre à jour' : 'Créer' }}</button>
        <button v-if="editingId" type="button" @click="cancelEdit">Annuler</button>
      </div>
    </form>

    <p v-if="eventStore.error" class="error">{{ eventStore.error }}</p>

    <!-- ─── Liste des événements ─────────────────────────────────────── -->
    <table v-if="eventStore.events.length" class="table">
      <thead>
        <tr>
          <th>Titre</th><th>Date</th><th>Horaire</th><th>Prix</th><th>Capacité</th><th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="ev in eventStore.events" :key="ev.id">
          <td>{{ ev.title }}</td>
          <td>{{ formatDate(ev.date) }}</td>
          <td>{{ ev.startTime.slice(11,16) }} – {{ ev.endTime.slice(11,16) }}</td>
          <td>{{ ev.priceCt === 0 ? 'Gratuit' : (ev.priceCt/100).toFixed(2)+' €' }}</td>
          <td>{{ ev.capacity ?? '—' }}</td>
          <td>
            <button @click="edit(ev)" :disabled="ev.isLocked">Éditer</button>
            <button @click="remove(ev.id)">Supprimer</button>
            <router-link :to="`