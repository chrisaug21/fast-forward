import { STREAMING_SERVICES } from "./constants";

export async function fetchJustWatch(retries = 3) {
  const corsProxy = "https://corsproxy.io/?";
  const services = STREAMING_SERVICES.map((service) => service.jwId);

  const query = `
    query GetPopularTitles($providers: [String!]!) {
      popularTitles(
        country: "US"
        first: 500
        filter: { packages: $providers }
      ) {
        edges {
          node {
            id
            objectType
            content(country: "US", language: "en") {
              title
              fullPath
              posterUrl
              genres { shortName }
              runtime
              scoring { imdbScore imdbCount }
              releaseYear
              shortDescription
            }
            offers(country: "US", platform: WEB) {
              package { clearName technicalName }
              standardWebURL
            }
          }
        }
      }
    }
  `;

  const url = `${corsProxy}https://apis.justwatch.com/graphql`;

  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables: { providers: services } }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const edges = data?.data?.popularTitles?.edges || [];

      return edges
        .map(({ node }) => {
          const content = node.content;
          const relevantOffers = (node.offers || []).filter((offer) =>
            services.includes(offer.package?.technicalName)
          );
          const streamingOn = [
            ...new Set(
              relevantOffers.map((offer) => {
                const service = STREAMING_SERVICES.find(
                  (item) => item.jwId === offer.package?.technicalName
                );
                return service ? service.label : offer.package?.clearName;
              })
            ),
          ];

          return {
            id: node.id,
            title: content?.title || "Unknown",
            type: node.objectType === "SHOW" ? "TV Show" : "Movie",
            genres: (content?.genres || []).map((genre) => genre.shortName),
            runtime: content?.runtime,
            imdbScore: content?.scoring?.imdbScore,
            releaseYear: content?.releaseYear,
            description: content?.shortDescription || "",
            posterUrl: content?.posterUrl
              ? `https://images.justwatch.com${content.posterUrl.replace(
                  "{profile}",
                  "s332"
                )}`
              : null,
            streamingOn,
            source: "streaming",
          };
        })
        .filter((title) => title.streamingOn.length > 0);
    } catch (error) {
      if (attempt === retries - 1) {
        throw error;
      }

      await new Promise((resolve) => {
        setTimeout(resolve, 1500 * (attempt + 1));
      });
    }
  }

  return [];
}
