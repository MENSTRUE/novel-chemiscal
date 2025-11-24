import pandas as pd
import numpy as np
from tqdm import tqdm
import os
import warnings
warnings.filterwarnings('ignore')

# RDKit imports
from rdkit import Chem
from rdkit.Chem import Descriptors, Crippen, Lipinski, AllChem
from rdkit.Chem import rdMolDescriptors
from rdkit import DataStructs

# CONFIGURATION

CONFIG = {
    'input_file': './data/unified_chemicals_raw.csv',
    'output_file': './data/unified_chemicals_enriched.csv',
}

# PROPERTY CALCULATOR

class ChemicalPropertyCalculator:
    """Calculate comprehensive chemical properties using RDKit"""
    
    def __init__(self):
        self.failed_count = 0
        self.success_count = 0
    
    def calculate_all_properties(self, smiles):
        """
        Calculate all properties for a given SMILES string
        
        Returns dict with all calculated properties
        """
        try:
            # Parse SMILES to molecule
            mol = Chem.MolFromSmiles(smiles)
            
            if mol is None:
                self.failed_count += 1
                return self._empty_properties()
            
            self.success_count += 1
            
            # Calculate all properties
            properties = {}
            
            # 1. Basic Molecular Properties
            properties.update(self._basic_properties(mol))
            
            # 2. Lipophilicity & Solubility Indicators
            properties.update(self._lipophilicity_properties(mol))
            
            # 3. Hydrogen Bonding
            properties.update(self._hbond_properties(mol))
            
            # 4. Structural Features
            properties.update(self._structural_properties(mol))
            
            # 5. Ring Information
            properties.update(self._ring_properties(mol))
            
            # 6. Drug-likeness Scores
            properties.update(self._druglikeness_properties(mol))
            
            # 7. Electronic Properties
            properties.update(self._electronic_properties(mol))
            
            # 8. Classifications
            properties.update(self._classifications(mol, properties))
            
            return properties
            
        except Exception as e:
            self.failed_count += 1
            return self._empty_properties()
    
    def _basic_properties(self, mol):
        """Basic molecular properties"""
        return {
            'calc_molecular_weight': Descriptors.MolWt(mol),
            'calc_exact_mass': Descriptors.ExactMolWt(mol),
            'calc_heavy_atom_count': Lipinski.HeavyAtomCount(mol),
            'calc_num_atoms': mol.GetNumAtoms(),
            'calc_num_bonds': mol.GetNumBonds(),
            'calc_formula': rdMolDescriptors.CalcMolFormula(mol),
        }
    
    def _lipophilicity_properties(self, mol):
        """Lipophilicity and solubility indicators"""
        logp = Crippen.MolLogP(mol)
        return {
            'calc_logp': logp,
            'calc_molar_refractivity': Crippen.MolMR(mol),
            'calc_tpsa': Descriptors.TPSA(mol),  # Topological Polar Surface Area
        }
    
    def _hbond_properties(self, mol):
        """Hydrogen bonding properties"""
        return {
            'calc_hbd': Lipinski.NumHDonors(mol),      # H-bond donors
            'calc_hba': Lipinski.NumHAcceptors(mol),   # H-bond acceptors
            'calc_num_amide_bonds': rdMolDescriptors.CalcNumAmideBonds(mol),
        }
    
    def _structural_properties(self, mol):
        """Structural features"""
        return {
            'calc_num_rotatable_bonds': Lipinski.NumRotatableBonds(mol),
            'calc_num_heteroatoms': Lipinski.NumHeteroatoms(mol),
            'calc_fraction_csp3': Lipinski.FractionCSP3(mol),
            'calc_num_stereocenters': len(Chem.FindMolChiralCenters(mol, includeUnassigned=True)),
            'calc_bertz_complexity': Descriptors.BertzCT(mol),
        }
    
    def _ring_properties(self, mol):
        """Ring-related properties"""
        return {
            'calc_num_rings': rdMolDescriptors.CalcNumRings(mol),
            'calc_num_aromatic_rings': Descriptors.NumAromaticRings(mol),
            'calc_num_saturated_rings': Descriptors.NumSaturatedRings(mol),
            'calc_num_aliphatic_rings': Descriptors.NumAliphaticRings(mol),
            'calc_num_aromatic_carbocycles': Descriptors.NumAromaticCarbocycles(mol),
            'calc_num_aromatic_heterocycles': Descriptors.NumAromaticHeterocycles(mol),
        }
    
    def _druglikeness_properties(self, mol):
        """Drug-likeness rules and scores"""
        # Lipinski's Rule of Five
        mw = Descriptors.MolWt(mol)
        logp = Crippen.MolLogP(mol)
        hbd = Lipinski.NumHDonors(mol)
        hba = Lipinski.NumHAcceptors(mol)
        
        lipinski_violations = 0
        if mw > 500: lipinski_violations += 1
        if logp > 5: lipinski_violations += 1
        if hbd > 5: lipinski_violations += 1
        if hba > 10: lipinski_violations += 1
        
        # Veber's rules (oral bioavailability)
        rotatable = Lipinski.NumRotatableBonds(mol)
        tpsa = Descriptors.TPSA(mol)
        
        veber_violations = 0
        if rotatable > 10: veber_violations += 1
        if tpsa > 140: veber_violations += 1
        
        return {
            'calc_lipinski_violations': lipinski_violations,
            'calc_lipinski_pass': lipinski_violations == 0,
            'calc_veber_violations': veber_violations,
            'calc_veber_pass': veber_violations == 0,
        }
    
    def _electronic_properties(self, mol):
        """Electronic properties"""
        try:
            return {
                'calc_num_radical_electrons': Descriptors.NumRadicalElectrons(mol),
                'calc_num_valence_electrons': Descriptors.NumValenceElectrons(mol),
            }
        except:
            return {
                'calc_num_radical_electrons': None,
                'calc_num_valence_electrons': None,
            }
    
    def _classifications(self, mol, properties):
        """Classify compounds into categories"""
        
        # Polarity Classification based on LogP
        logp = properties.get('calc_logp', 0)
        if logp < -1:
            polarity = 'very_polar'
        elif logp < 1:
            polarity = 'polar'
        elif logp < 3:
            polarity = 'moderately_polar'
        elif logp < 5:
            polarity = 'lipophilic'
        else:
            polarity = 'very_lipophilic'
        
        # Size Classification based on MW
        mw = properties.get('calc_molecular_weight', 0)
        if mw < 100:
            size_class = 'very_small'
        elif mw < 200:
            size_class = 'small'
        elif mw < 400:
            size_class = 'medium'
        elif mw < 600:
            size_class = 'large'
        else:
            size_class = 'very_large'
        
        # Compound Type Classification
        smiles = Chem.MolToSmiles(mol)
        num_aromatic = properties.get('calc_num_aromatic_rings', 0)
        hbd = properties.get('calc_hbd', 0)
        hba = properties.get('calc_hba', 0)
        
        if num_aromatic >= 2:
            compound_type = 'polyaromatic'
        elif num_aromatic == 1:
            compound_type = 'aromatic'
        elif 'O' in smiles and hbd > 0:
            compound_type = 'alcohol_or_phenol'
        elif 'O' in smiles and '=' in smiles:
            compound_type = 'carbonyl'
        elif 'N' in smiles:
            compound_type = 'nitrogen_containing'
        elif 'S' in smiles:
            compound_type = 'sulfur_containing'
        elif 'F' in smiles or 'Cl' in smiles or 'Br' in smiles or 'I' in smiles:
            compound_type = 'halogenated'
        else:
            compound_type = 'hydrocarbon'
        
        # Solubility Prediction (rough estimate based on TPSA and LogP)
        tpsa = properties.get('calc_tpsa', 0)
        if tpsa > 100 and logp < 2:
            solubility_class = 'water_soluble'
        elif tpsa > 50 and logp < 4:
            solubility_class = 'moderately_soluble'
        else:
            solubility_class = 'poorly_soluble'
        
        return {
            'class_polarity': polarity,
            'class_size': size_class,
            'class_compound_type': compound_type,
            'class_solubility': solubility_class,
        }
    
    def _empty_properties(self):
        """Return empty properties dict for failed molecules"""
        return {
            'calc_molecular_weight': None,
            'calc_exact_mass': None,
            'calc_heavy_atom_count': None,
            'calc_num_atoms': None,
            'calc_num_bonds': None,
            'calc_formula': None,
            'calc_logp': None,
            'calc_molar_refractivity': None,
            'calc_tpsa': None,
            'calc_hbd': None,
            'calc_hba': None,
            'calc_num_amide_bonds': None,
            'calc_num_rotatable_bonds': None,
            'calc_num_heteroatoms': None,
            'calc_fraction_csp3': None,
            'calc_num_stereocenters': None,
            'calc_bertz_complexity': None,
            'calc_num_rings': None,
            'calc_num_aromatic_rings': None,
            'calc_num_saturated_rings': None,
            'calc_num_aliphatic_rings': None,
            'calc_num_aromatic_carbocycles': None,
            'calc_num_aromatic_heterocycles': None,
            'calc_lipinski_violations': None,
            'calc_lipinski_pass': None,
            'calc_veber_violations': None,
            'calc_veber_pass': None,
            'calc_num_radical_electrons': None,
            'calc_num_valence_electrons': None,
            'class_polarity': None,
            'class_size': None,
            'class_compound_type': None,
            'class_solubility': None,
        }


# DESCRIPTION GENERATOR

class ChemicalDescriptionGenerator:
    """Generate natural language descriptions for chemicals"""
    
    def generate_description(self, row):
        """Generate comprehensive text description for a chemical"""
        parts = []
        
        # Name and formula
        name = row.get('name', 'Unknown')
        formula = row.get('calc_formula') or row.get('molecular_formula', '')
        parts.append(f"{name} is a chemical compound with molecular formula {formula}.")
        
        # Molecular properties
        mw = row.get('calc_molecular_weight')
        if pd.notna(mw):
            parts.append(f"It has a molecular weight of {mw:.2f} g/mol.")
        
        # Polarity and solubility
        polarity = row.get('class_polarity')
        solubility = row.get('class_solubility')
        if polarity:
            polarity_text = polarity.replace('_', ' ')
            parts.append(f"The compound is {polarity_text}.")
        if solubility:
            solubility_text = solubility.replace('_', ' ')
            parts.append(f"It is predicted to be {solubility_text}.")
        
        # LogP
        logp = row.get('calc_logp')
        if pd.notna(logp):
            parts.append(f"LogP value is {logp:.2f}, indicating its lipophilicity.")
        
        # TPSA
        tpsa = row.get('calc_tpsa')
        if pd.notna(tpsa):
            parts.append(f"Topological polar surface area (TPSA) is {tpsa:.2f} Ų.")
        
        # Hydrogen bonding
        hbd = row.get('calc_hbd')
        hba = row.get('calc_hba')
        if pd.notna(hbd) and pd.notna(hba):
            parts.append(f"It has {int(hbd)} hydrogen bond donors and {int(hba)} hydrogen bond acceptors.")
        
        # Ring information
        aromatic = row.get('calc_num_aromatic_rings')
        total_rings = row.get('calc_num_rings')
        if pd.notna(aromatic) and aromatic > 0:
            parts.append(f"Contains {int(aromatic)} aromatic ring(s).")
        elif pd.notna(total_rings) and total_rings > 0:
            parts.append(f"Contains {int(total_rings)} ring(s) in its structure.")
        
        # Compound type
        compound_type = row.get('class_compound_type')
        if compound_type:
            type_text = compound_type.replace('_', ' ')
            parts.append(f"Classified as {type_text}.")
        
        # Drug-likeness
        lipinski_pass = row.get('calc_lipinski_pass')
        if lipinski_pass == True:
            parts.append("Passes Lipinski's Rule of Five for drug-likeness.")
        elif lipinski_pass == False:
            violations = row.get('calc_lipinski_violations', 0)
            parts.append(f"Has {int(violations)} Lipinski's Rule violations.")
        
        # Source
        source = row.get('source', '')
        if source:
            parts.append(f"Data sourced from {source}.")
        
        return ' '.join(parts)


# MAIN ENRICHMENT PIPELINE

def main():
    
    # Load raw dataset
    print("="*70)
    print(" LOADING RAW DATASET")
    print("="*70)
    
    if not os.path.exists(CONFIG['input_file']):
        print(f" Error: Input file not found: {CONFIG['input_file']}")
        print("   Please run 01_download_datasets.py first")
        return None
    
    df = pd.read_csv(CONFIG['input_file'])
    print(f" Loaded {len(df)} compounds from {CONFIG['input_file']}")
    
    # Initialize calculators
    calculator = ChemicalPropertyCalculator()
    description_gen = ChemicalDescriptionGenerator()
    
    # Calculate properties
    print("\n" + "="*70)
    print("CALCULATING CHEMICAL PROPERTIES")
    print("="*70)
    
    properties_list = []
    
    for idx, row in tqdm(df.iterrows(), total=len(df), desc="Processing molecules"):
        smiles = row.get('smiles') or row.get('canonical_smiles')
        
        if pd.notna(smiles):
            props = calculator.calculate_all_properties(smiles)
        else:
            props = calculator._empty_properties()
        
        properties_list.append(props)
    
    # Add calculated properties to dataframe
    props_df = pd.DataFrame(properties_list)
    df_enriched = pd.concat([df.reset_index(drop=True), props_df], axis=1)
    
    print(f"\n Successfully processed: {calculator.success_count}")
    print(f"Failed to process: {calculator.failed_count}")
    
    # Generate descriptions
    print("\n" + "="*70)
    print("GENERATING DESCRIPTIONS")
    print("="*70)
    
    descriptions = []
    for idx, row in tqdm(df_enriched.iterrows(), total=len(df_enriched), desc="Generating descriptions"):
        desc = description_gen.generate_description(row)
        descriptions.append(desc)
    
    df_enriched['description'] = descriptions
    print(f"Generated {len(descriptions)} descriptions")
    
    # Remove duplicates
    print("\n" + "="*70)
    print("CLEANING DATA")
    print("="*70)
    
    initial_count = len(df_enriched)
    df_enriched = df_enriched.drop_duplicates(subset=['smiles'], keep='first')
    df_enriched = df_enriched.dropna(subset=['smiles'])
    final_count = len(df_enriched)
    
    print(f"   Initial: {initial_count} compounds")
    print(f"   After dedup: {final_count} compounds")
    print(f"   Removed: {initial_count - final_count} duplicates/invalid")
    
    # Print statistics
    print("\n" + "="*70)
    print("ENRICHED DATASET STATISTICS")
    print("="*70)
    
    print(f"\n Total Compounds: {len(df_enriched)}")
    print(f" Total Columns: {len(df_enriched.columns)}")
    
    print(f"\n By Source:")
    for source, count in df_enriched['source'].value_counts().items():
        pct = count / len(df_enriched) * 100
        print(f"   - {source}: {count} ({pct:.1f}%)")
    
    print(f"\n By Polarity Class:")
    if 'class_polarity' in df_enriched.columns:
        for pol, count in df_enriched['class_polarity'].value_counts().items():
            print(f"   - {pol}: {count}")
    
    print(f"\n By Compound Type:")
    if 'class_compound_type' in df_enriched.columns:
        for comp_type, count in df_enriched['class_compound_type'].value_counts().items():
            print(f"   - {comp_type}: {count}")
    
    print(f"\n By Size Class:")
    if 'class_size' in df_enriched.columns:
        for size, count in df_enriched['class_size'].value_counts().items():
            print(f"   - {size}: {count}")
    
    # Save enriched dataset
    print("\n" + "="*70)
    print(" SAVING ENRICHED DATASET")
    print("="*70)
    
    df_enriched.to_csv(CONFIG['output_file'], index=False)
    print(f"Saved to: {CONFIG['output_file']}")
    
    # Print column summary
    print(f"\n All Columns ({len(df_enriched.columns)}):")
    for i, col in enumerate(df_enriched.columns, 1):
        print(f"   {i:2d}. {col}")
    
    print("\n" + "="*70)
    print("ENRICHMENT COMPLETE!")
    print("="*70)
    
    # Sample output
    print("\n" + "="*70)
    print("SAMPLE DATA (First 3 compounds):")
    print("="*70)
    
    sample_cols = ['name', 'molecular_formula', 'calc_molecular_weight', 
                   'calc_logp', 'class_polarity', 'class_compound_type']
    print(df_enriched[sample_cols].head(3).to_string())
    
    return df_enriched


if __name__ == "__main__":
    df = main()