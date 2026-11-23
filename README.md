# La LPN

Visualisation indicative de la limite pluie-neige, notamment autour de Valmorel.

## Méthode

- Utilise les **prévisions** Open-Meteo de température, humidité relative, vent et précipitations, à plusieurs altitudes.
- Interpole le profil de température et calcule le **thermomètre mouillé**. La LPN n'est **pas** l'isotherme 0 °C.
- Sous **précipitations fortes et persistantes**, si température, humidité et vent sont compatibles, ajoute une correction supplémentaire plafonnée de **270 m** pour l'effet de fonte/isothermie.
- Sans précipitations, la limite affichée reste une **LPN potentielle** ; elle n'indique pas de neige qui tombe réellement.
- L'affichage du 0 °C sert à comparer les deux niveaux.
- **Neige au sol uniquement** : la page importe le moteur SnowFusion publié par [MyWeather](https://noskarant.github.io/myweather/) et interroge les mêmes modèles (AROME, ICON, ECMWF, ARPEGE). À partir de l'épaisseur initiale Open-Meteo et des prévisions horaires, ce moteur estime tassement, fonte et nouvelles chutes. La température, les précipitations et la LPN de la page ne sont pas remplacées par cette fusion.
- Le calcul utilise 48 h d'historique, comme MyWeather. Les chiffres restent des **estimations de modèle, pas des mesures**. Si le moteur ou l'API de modèles est indisponible, l'affichage conserve directement `snow_depth` d'Open-Meteo, sans inventer 0 cm si la donnée manque.
- Les écarts de coordonnées, d'altitude, d'horaire et les corrections de relief peuvent produire de petites différences avec les valeurs affichées dans MyWeather pour un autre lieu.

**Limite** : estimation heuristique non calibrée par mesure locale. L'incertitude peut dépasser plusieurs centaines de mètres, en particulier sous inversions, dans les vallées encaissées ou sous convection.

## Observations locales facultatives

Le calcul peut utiliser des **observations réelles** pour corriger les températures et précipitations du modèle, mais **aucun fournisseur d'observations n'est encore connecté**. Les valeurs `current` d'Open-Meteo ne sont pas des relevés de stations.

Pour connecter Météo-France ou un autre fournisseur autorisé, renseigner la constante `OBSERVATIONS_URL` dans `index.html` avec une URL HTTPS de proxy serveur accessible en CORS, renvoyant le JSON suivant :

```json
{
  "stations": [
    {
      "name": "Station altitude",
      "lat": 45.45,
      "lon": 6.50,
      "altitude": 1516,
      "time": "2026-11-19T09:40:00+01:00",
      "temperature": 0.6,
      "humidity": 94,
      "precipitation_1h": 3.2
    }
  ]
}
```

Unités : mètres, degrés Celsius, pourcentage et mm sur 1 h. Les stations doivent avoir des horodatages fiables et des coordonnées vérifiées. Le moteur rejette les mesures de plus de 60 minutes, à plus de 20 km de Valmorel ou manifestement invalides. Les corrections thermiques sont plafonnées à ±2 °C par station, puis pondérées. Les observations ne corrigent pas les prévisions des heures futures.

**Sécurité** : l'API officielle Météo-France Observations nécessite un compte et un jeton d'accès. Les identifiants restent exclusivement dans le proxy serveur, jamais dans le code de GitHub Pages. Sans proxy configuré, le site indique clairement « observations non connectées (modèle seul) ».

## Tests

Exécuter `node tests/lpn.test.cjs`. GitHub Actions exécute automatiquement les tests sur les commits et pull requests.
