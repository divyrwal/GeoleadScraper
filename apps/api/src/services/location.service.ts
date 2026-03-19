import { Country, State, City } from 'country-state-city';

export class LocationService {
    static getCountries() {
        return Country.getAllCountries().map(c => ({
            code: c.isoCode,
            name: c.name,
            phone_code: c.phonecode,
            currency: c.currency,
            flag: c.flag
        }));
    }

    static getStates(countryCode: string) {
        if (!countryCode) return [];
        return State.getStatesOfCountry(countryCode).map(s => ({
            code: s.isoCode,
            name: s.name,
            country_code: s.countryCode
        }));
    }

    static getCities(countryCode: string, stateCode: string) {
        if (!countryCode || !stateCode) return [];
        return City.getCitiesOfState(countryCode, stateCode).map(c => ({
            name: c.name,
            state_code: c.stateCode,
            country_code: c.countryCode,
            lat: parseFloat(c.latitude || "0"),
            lng: parseFloat(c.longitude || "0")
        }));
    }

    static searchCities(query: string) {
        // This is a more complex operation if we want global search
        // For now, we'll keep it simple or use it for specific state context
        if (!query || query.length < 2) return [];
        
        // Note: country-state-city doesn't have a direct "search cities" without context
        // We'll rely on the existing Photon API for global city search if needed,
        // or just provide hierarchical selection.
        return [];
    }
}
