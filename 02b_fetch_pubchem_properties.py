import pandas as pd
import requests
import time
from tqdm import tqdm
import warnings
warnings.filterwarnings('ignore')

# CONFIGURATION

CONFIG = {
    'input_file': './data/unified_chemicals_enriched.csv',
    'output_file': './data/unified_chemicals_final.csv',
    'rate_limit_delay': 0.3,  # PubChem rate limit
}

# PUBCHEM PROPERTY FETCHER

class PubChemPropertyFetcher:
    """Fetch additional properties from PubChem API"""
    
    BASE_URL = "https://pubchem.ncbi.nlm.nih.gov/rest/pug"
    VIEW_URL = "https://pubchem.ncbi.nlm.nih.gov/rest/pug_view"
    
    def __init__(self):
        self.session = requests.Session()
        self.cache = {}
    
    def get_cid_from_smiles(self, smiles):
        """Get PubChem CID from SMILES"""
        try:
            url = f"{self.BASE_URL}/compound/smiles/{smiles}/cids/JSON"
            response = self.session.get(url, timeout=10)
            if response.status_code == 200:
                data = response.json()
                return data.get('IdentifierList', {}).get('CID', [None])[0]
        except:
            pass
        return None
    
    def get_experimental_properties(self, cid):
        """Get experimental properties from PubChem"""
        if not cid:
            return {}
        
        # Check cache
        if cid in self.cache:
            return self.cache[cid]
        
        properties = {
            'boiling_point_celsius': None,
            'melting_point_celsius': None,
            'density_gcm3': None,
            'flash_point_celsius': None,
            'solubility_in_water': None,
            'vapor_pressure_mmhg': None,
            'ghs_hazard_statements': None,
            'safety_summary': None,
        }
        
        try:
            # Get compound record with all sections
            url = f"{self.VIEW_URL}/data/compound/{cid}/JSON"
            response = self.session.get(url, timeout=15)
            
            if response.status_code != 200:
                return properties
            
            data = response.json()
            record = data.get('Record', {})
            sections = record.get('Section', [])
            
            # Parse sections
            for section in sections:
                section_name = section.get('TOCHeading', '')
                
                # Chemical and Physical Properties
                if section_name == 'Chemical and Physical Properties':
                    properties.update(self._parse_physical_properties(section))
                
                # Safety and Hazards
                elif section_name == 'Safety and Hazards':
                    properties.update(self._parse_safety_info(section))
            
            # Cache result
            self.cache[cid] = properties
            
        except Exception as e:
            pass
        
        return properties
    
    def _parse_physical_properties(self, section):
        """Parse physical properties section"""
        props = {}
        
        try:
            for subsection in section.get('Section', []):
                heading = subsection.get('TOCHeading', '')
                
                # Experimental Properties
                if heading == 'Experimental Properties':
                    for prop_section in subsection.get('Section', []):
                        prop_name = prop_section.get('TOCHeading', '')
                        
                        # Get the first value
                        info = prop_section.get('Information', [])
                        if info:
                            value = self._extract_value(info[0])
                            
                            if prop_name == 'Boiling Point':
                                props['boiling_point_celsius'] = self._parse_temperature(value)
                            elif prop_name == 'Melting Point':
                                props['melting_point_celsius'] = self._parse_temperature(value)
                            elif prop_name == 'Density':
                                props['density_gcm3'] = self._parse_density(value)
                            elif prop_name == 'Flash Point':
                                props['flash_point_celsius'] = self._parse_temperature(value)
                            elif prop_name == 'Solubility':
                                props['solubility_in_water'] = value
                            elif prop_name == 'Vapor Pressure':
                                props['vapor_pressure_mmhg'] = value
        except:
            pass
        
        return props
    
    def _parse_safety_info(self, section):
        """Parse safety and hazards section"""
        props = {}
        
        try:
            for subsection in section.get('Section', []):
                heading = subsection.get('TOCHeading', '')
                
                if heading == 'Hazards Identification':
                    for hazard_section in subsection.get('Section', []):
                        hazard_name = hazard_section.get('TOCHeading', '')
                        
                        if hazard_name == 'GHS Classification':
                            # Get hazard statements
                            statements = []
                            for info in hazard_section.get('Information', []):
                                value = self._extract_value(info)
                                if value and 'H' in str(value):
                                    statements.append(value)
                            if statements:
                                props['ghs_hazard_statements'] = '|'.join(statements[:5])
                        
                        elif hazard_name == 'Safety Summary':
                            info = hazard_section.get('Information', [])
                            if info:
                                props['safety_summary'] = self._extract_value(info[0])
        except:
            pass
        
        return props
    
    def _extract_value(self, info):
        """Extract value from PubChem info structure"""
        try:
            # Try different value formats
            if 'Value' in info:
                value = info['Value']
                if 'StringWithMarkup' in value:
                    return value['StringWithMarkup'][0].get('String', '')
                elif 'Number' in value:
                    return value['Number'][0]
            elif 'StringValue' in info:
                return info['StringValue']
        except:
            pass
        return None
    
    def _parse_temperature(self, value):
        """Parse temperature value to Celsius"""
        if not value:
            return None
        
        try:
            value_str = str(value).lower()
            
            # Extract number
            import re
            numbers = re.findall(r'[-+]?\d*\.?\d+', value_str)
            if not numbers:
                return None
            
            temp = float(numbers[0])
            
            # Convert from Fahrenheit if needed
            if '°f' in value_str or 'f' in value_str:
                temp = (temp - 32) * 5/9
            
            return round(temp, 1)
        except:
            return None
    
    def _parse_density(self, value):
        """Parse density value"""
        if not value:
            return None
        
        try:
            import re
            numbers = re.findall(r'[-+]?\d*\.?\d+', str(value))
            if numbers:
                density = float(numbers[0])
                if 0.1 < density < 15:  # Reasonable range
                    return round(density, 3)
        except:
            pass
        return None


# APPLICATION CATEGORY CLASSIFIER

class ApplicationClassifier:
    """Classify chemicals by application"""
    
    # Keywords for classification
    SOLVENT_KEYWORDS = ['solvent', 'dissolve', 'extraction', 'cleaning']
    FUEL_KEYWORDS = ['fuel', 'combustion', 'energy', 'gasoline', 'diesel']
    FEEDSTOCK_KEYWORDS = ['precursor', 'synthesis', 'production', 'manufacturing']
    PHARMA_KEYWORDS = ['drug', 'pharmaceutical', 'medicine', 'therapeutic']
    POLYMER_KEYWORDS = ['polymer', 'plastic', 'resin', 'monomer']
    
    def classify(self, row):
        """Classify chemical by application"""
        categories = []
        
        compound_type = str(row.get('class_compound_type', '')).lower()
        polarity = str(row.get('class_polarity', '')).lower()
        name = str(row.get('name', '')).lower()
        search_cat = str(row.get('search_category', '')).lower()
        mw = row.get('calc_molecular_weight', 0)
        bp = row.get('boiling_point_celsius')
        
        # Rule-based classification
        
        # Solvents
        if compound_type in ['alcohol_or_phenol', 'carbonyl']:
            categories.append('solvent')
        if polarity in ['polar', 'very_polar'] and mw and mw < 200:
            categories.append('solvent')
        if 'ether' in name or 'acetone' in name or 'acetonitrile' in name:
            categories.append('solvent')
        
        # Fuels
        if compound_type == 'hydrocarbon' and mw and mw < 150:
            categories.append('fuel')
        if any(k in name for k in ['methane', 'ethane', 'propane', 'butane', 'octane']):
            categories.append('fuel')
        
        # Feedstock/Intermediate
        if compound_type in ['aromatic', 'polyaromatic']:
            categories.append('feedstock')
        if search_cat == 'bioactive':
            categories.append('pharmaceutical_intermediate')
        
        # Monomers
        if 'ene' in name or 'vinyl' in name or 'acryl' in name:
            categories.append('monomer')
        
        # Default
        if not categories:
            categories.append('industrial_chemical')
        
        return '|'.join(categories)
    
    def get_functional_properties(self, row):
        """Get functional properties"""
        properties = []
        
        compound_type = str(row.get('class_compound_type', '')).lower()
        polarity = str(row.get('class_polarity', '')).lower()
        hbd = row.get('calc_hbd', 0)
        hba = row.get('calc_hba', 0)
        
        # Based on structure
        if hbd and hbd > 0:
            properties.append('hydrogen_bond_donor')
        if hba and hba > 0:
            properties.append('hydrogen_bond_acceptor')
        if compound_type == 'aromatic':
            properties.append('aromatic')
        if polarity in ['polar', 'very_polar']:
            properties.append('polar')
        if polarity in ['lipophilic', 'very_lipophilic']:
            properties.append('hydrophobic')
        
        if not properties:
            properties.append('general')
        
        return '|'.join(properties)
    
    def get_origin_source(self, row):
        """Determine origin source"""
        compound_type = str(row.get('class_compound_type', '')).lower()
        name = str(row.get('name', '')).lower()
        
        if compound_type == 'hydrocarbon':
            return 'petroleum'
        elif compound_type in ['aromatic', 'polyaromatic']:
            return 'petroleum|coal_tar'
        elif 'bio' in name or 'natural' in name:
            return 'bio_based'
        elif compound_type == 'alcohol_or_phenol':
            return 'synthetic|bio_based'
        else:
            return 'synthetic'


# SAFETY CLASSIFIER

class SafetyClassifier:
    """Classify safety risk level"""
    
    def classify_risk(self, row):
        """Classify safety risk level"""
        # Get properties
        logp = row.get('calc_logp', 0)
        mw = row.get('calc_molecular_weight', 0)
        compound_type = str(row.get('class_compound_type', '')).lower()
        bp = row.get('boiling_point_celsius')
        flash_point = row.get('flash_point_celsius')
        ghs = str(row.get('ghs_hazard_statements', '')).lower()
        
        risk_score = 0
        hazards = []
        
        # Flammability
        if bp and bp < 40:
            risk_score += 3
            hazards.append('Highly_flammable')
        elif bp and bp < 100:
            risk_score += 2
            hazards.append('Flammable')
        
        if flash_point and flash_point < 23:
            risk_score += 2
            hazards.append('Low_flash_point')
        
        # Volatility (small + non-polar = volatile = inhalation risk)
        if mw and mw < 100 and logp and logp > 0:
            risk_score += 1
            hazards.append('Volatile')
        
        # Compound type risks
        if compound_type == 'halogenated':
            risk_score += 2
            hazards.append('Halogenated')
        if compound_type == 'nitrogen_containing':
            risk_score += 1
        
        # GHS signals
        if 'fatal' in ghs or 'toxic' in ghs:
            risk_score += 3
            hazards.append('Toxic')
        if 'carcinogen' in ghs or 'cancer' in ghs:
            risk_score += 3
            hazards.append('Carcinogenic')
        if 'irritant' in ghs:
            risk_score += 1
            hazards.append('Irritant')
        
        # Classify
        if risk_score >= 5:
            risk_level = 'High'
        elif risk_score >= 2:
            risk_level = 'Medium'
        else:
            risk_level = 'Low'
        
        if not hazards:
            hazards.append('See_MSDS')
        
        return risk_level, '|'.join(hazards)


# MAIN FUNCTION

def main():
    
    # Load dataset
    print("="*70)
    print(" LOADING DATASET")
    print("="*70)
    
    df = pd.read_csv(CONFIG['input_file'])
    print(f" Loaded {len(df)} compounds")
    
    # Initialize
    fetcher = PubChemPropertyFetcher()
    classifier = ApplicationClassifier()
    safety_classifier = SafetyClassifier()
    
    # New columns
    new_data = {
        'boiling_point_celsius': [],
        'melting_point_celsius': [],
        'density_gcm3': [],
        'flash_point_celsius': [],
        'solubility_in_water': [],
        'vapor_pressure_mmhg': [],
        'ghs_hazard_statements': [],
        'application_category': [],
        'functional_properties': [],
        'origin_source': [],
        'safety_risk_level': [],
        'safety_hazards': [],
        'msds_link': [],
        'is_raw_material_available': [],
    }
    
    # Process each compound
    print("\n" + "="*70)
    print("🌐 FETCHING DATA FROM PUBCHEM API")
    print("="*70)
    print("⏳ This may take 5-10 minutes for 500+ compounds...")
    
    fetched_count = 0
    
    for idx, row in tqdm(df.iterrows(), total=len(df), desc="Fetching"):
        # Get CID
        source_id = str(row.get('source_id', ''))
        cid = None
        
        if 'CID' in source_id:
            cid = source_id.replace('CID', '')
        elif 'CHEMBL' not in source_id:
            # Try to get CID from SMILES
            smiles = row.get('smiles', '')
            if smiles and pd.notna(smiles):
                cid = fetcher.get_cid_from_smiles(smiles)
        
        # Fetch properties from PubChem
        props = {}
        if cid:
            props = fetcher.get_experimental_properties(cid)
            if props.get('boiling_point_celsius'):
                fetched_count += 1
            time.sleep(CONFIG['rate_limit_delay'])
        
        # Store fetched properties
        new_data['boiling_point_celsius'].append(props.get('boiling_point_celsius'))
        new_data['melting_point_celsius'].append(props.get('melting_point_celsius'))
        new_data['density_gcm3'].append(props.get('density_gcm3'))
        new_data['flash_point_celsius'].append(props.get('flash_point_celsius'))
        new_data['solubility_in_water'].append(props.get('solubility_in_water'))
        new_data['vapor_pressure_mmhg'].append(props.get('vapor_pressure_mmhg'))
        new_data['ghs_hazard_statements'].append(props.get('ghs_hazard_statements'))
        
        # Classify application
        new_data['application_category'].append(classifier.classify(row))
        new_data['functional_properties'].append(classifier.get_functional_properties(row))
        new_data['origin_source'].append(classifier.get_origin_source(row))
        
        # Classify safety (include GHS data)
        row_with_ghs = row.copy()
        row_with_ghs['ghs_hazard_statements'] = props.get('ghs_hazard_statements', '')
        row_with_ghs['boiling_point_celsius'] = props.get('boiling_point_celsius')
        row_with_ghs['flash_point_celsius'] = props.get('flash_point_celsius')
        
        risk_level, hazards = safety_classifier.classify_risk(row_with_ghs)
        new_data['safety_risk_level'].append(risk_level)
        new_data['safety_hazards'].append(hazards)
        
        # MSDS link
        if cid:
            new_data['msds_link'].append(f"https://pubchem.ncbi.nlm.nih.gov/compound/{cid}#section=Safety-and-Hazards")
        else:
            new_data['msds_link'].append(None)
        
        # Availability (assume available if in PubChem)
        new_data['is_raw_material_available'].append(True if cid else None)
    
    print(f"\n Successfully fetched data for {fetched_count} compounds")
    
    # Add to dataframe
    for col, data in new_data.items():
        df[col] = data
    
    # Update descriptions
    print("\n" + "="*70)
    print("UPDATING DESCRIPTIONS")
    print("="*70)
    
    updated_descriptions = []
    for idx, row in tqdm(df.iterrows(), total=len(df), desc="Updating"):
        old_desc = str(row.get('description', ''))
        additions = []
        
        bp = row.get('boiling_point_celsius')
        if pd.notna(bp):
            additions.append(f"Boiling point: {bp}°C.")
        
        mp = row.get('melting_point_celsius')
        if pd.notna(mp):
            additions.append(f"Melting point: {mp}°C.")
        
        density = row.get('density_gcm3')
        if pd.notna(density):
            additions.append(f"Density: {density} g/cm³.")
        
        app_cat = row.get('application_category')
        if pd.notna(app_cat):
            additions.append(f"Applications: {app_cat.replace('|', ', ')}.")
        
        safety = row.get('safety_risk_level')
        if pd.notna(safety):
            additions.append(f"Safety risk: {safety}.")
        
        new_desc = old_desc + ' ' + ' '.join(additions)
        updated_descriptions.append(new_desc.strip())
    
    df['description'] = updated_descriptions
    
    # Statistics
    print("\n" + "="*70)
    print(" FINAL STATISTICS")
    print("="*70)
    
    print(f"\n Total Compounds: {len(df)}")
    print(f" Total Columns: {len(df.columns)}")
    
    print(f"\n Data Coverage (from PubChem API):")
    for col in ['boiling_point_celsius', 'density_gcm3', 'flash_point_celsius', 'ghs_hazard_statements']:
        non_null = df[col].notna().sum()
        pct = non_null / len(df) * 100
        print(f"   - {col}: {non_null}/{len(df)} ({pct:.1f}%)")
    
    print(f"\n By Safety Risk Level:")
    for level, count in df['safety_risk_level'].value_counts().items():
        print(f"   - {level}: {count}")
    
    print(f"\n By Application Category (top 10):")
    all_apps = []
    for apps in df['application_category'].dropna():
        all_apps.extend(str(apps).split('|'))
    for app, count in pd.Series(all_apps).value_counts().head(10).items():
        print(f"   - {app}: {count}")
    
    # Save
    print("\n" + "="*70)
    print("SAVING FINAL DATASET")
    print("="*70)
    
    df.to_csv(CONFIG['output_file'], index=False)
    print(f" Saved to: {CONFIG['output_file']}")
    
    print(f"\n New Columns Added:")
    for col in new_data.keys():
        print(f"    {col}")
    
    print("\n" + "="*70)
    print(" COMPLETE!")
    print("="*70)
    
    return df


if __name__ == "__main__":
    df = main()